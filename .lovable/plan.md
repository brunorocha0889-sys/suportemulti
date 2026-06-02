
# Painel de criação de setores receptores

Hoje "Patrimônio" e "Climatização" são fixos (enum `setor_tipo` no banco + literal `"patrimonio" | "refrigeracao"` no código). Vou transformar a lista de setores receptores em **dados** (tabela), mantendo os dois atuais funcionando, e adicionar um painel protegido por senha mestra para cadastrar novos.

## 1. Banco

Nova tabela `setores_receptores`:
- `slug` (text, único) — usado na URL (`/app/<slug>`, `/auth/<slug>`)
- `nome` — rótulo de exibição ("Almoxarifado")
- `cor_hex` — cor escolhida para o badge
- `ativo` (bool)

Seed automático dos dois setores existentes (`patrimonio` → "Patrimônio", `refrigeracao` → "Climatização") com as cores atuais para não quebrar nada.

RLS: leitura pública dos ativos (necessária para a tela inicial mostrar os botões). Inserir/atualizar/excluir só via server function que valide a senha mestra.

Observação importante: o enum `setor_tipo` continua existindo no banco (tabelas `chamados`, `perfis`, `sla_config` usam ele) e o `ALTER TYPE ... ADD VALUE` não roda dentro de transação de migration de forma confiável. Para destravar setores novos sem mexer no enum, vou:
- adicionar coluna `setor_slug TEXT` em `chamados`, `perfis`, `sla_config`, `setores_solicitantes` apontando para `setores_receptores.slug`
- backfill a partir do enum atual
- novas inserções passam a usar `setor_slug`; o enum vira apenas legado para os registros antigos
- helpers `get_user_setor`, `is_staff`, RLS e seed de SLA passam a usar `setor_slug`

## 2. Senha mestra

Novo secret `MASTER_SECTOR_PASSWORD`. Server function `criarSetorReceptor` (TanStack `createServerFn` com `supabaseAdmin`) que:
- recebe `{ senha, nome, cor_hex }`
- valida senha com `timingSafeEqual` vs `process.env.MASTER_SECTOR_PASSWORD`
- gera slug a partir do nome (lowercase, sem acento, `[a-z0-9-]`, único — sufixa `-2`, `-3` se colidir)
- insere em `setores_receptores`
- insere `sla_config` padrão para o novo setor
- cria o usuário `Admin` padrão (`admin@<slug>.local` / senha padrão igual aos demais) via `supabaseAdmin.auth.admin.createUser` + perfil com `role='admin'` e `setor_slug=<slug>`
- retorna o slug para o front redirecionar

## 3. Frontend

- **Página `/painel-mestre`** (rota pública, sem auth): campo de senha mestra → libera formulário com `nome` + seletor de cor (`<input type="color">` + presets) + botão "Criar setor". Mostra também a lista de setores existentes com toggle ativo/inativo.
- **Tela inicial (`/`)**: deixa de listar os 2 setores fixos e passa a renderizar cards a partir de `setores_receptores` (ativos). Cada card usa `cor_hex` para o destaque. Link "Painel mestre" discreto no rodapé.
- **`/auth/$setor` e `/app/$setor`**: param `$setor` deixa de ser validado contra a lista fixa; valida contra `setores_receptores`. `setorLabel()` passa a consultar a tabela (via React Query cache global) em vez do `if patrimonio else refrigeracao`.
- **`auth-context`**: `Setor` vira `string` (o slug). `perfil.setor` lê a coluna nova `setor_slug` com fallback para o enum antigo.
- **Cores**: removo as classes hardcoded `bg-patrimonio` / `bg-refrigeracao` no CSS. Onde elas eram usadas, aplico `style={{ backgroundColor: setor.cor_hex }}` (componente helper para manter contraste do texto).
- **Componentes existentes** (`chamado-dialog`, `relatorios`, `app.$setor`, `setores-tab`, etc.): trocam o uso de `Setor` literal pelo slug dinâmico — sem mudança de lógica, só o tipo e a origem da lista.

## 4. Segurança da senha mestra

- Senha vive só como secret de servidor, nunca embarcada no bundle.
- A server function é o único caminho que cria/edita/desativa setor receptor.
- Rate-limit simples: 5 tentativas erradas em 10 min por IP (tabela `master_login_attempts` ou em memória do worker — vou usar tabela, já que worker é stateless).
- Toggle ativo/inativo no painel também pede a senha mestra (mesma sessão guarda em `sessionStorage` por 30 min só para evitar redigitar a cada ação — não é segurança, apenas UX; cada requisição revalida no servidor).

## Detalhes técnicos

- Migration única: tabela `setores_receptores` + colunas `setor_slug` nas 4 tabelas + backfill + RLS + GRANTs + seed dos dois setores atuais + linha em `sla_config` para cada um.
- `criarSetorReceptor`, `listarSetoresReceptores`, `alternarSetorReceptor` em `src/lib/setores-receptores.functions.ts`.
- Secret `MASTER_SECTOR_PASSWORD` solicitado via `add_secret` antes de escrever o código.
- Tipo `Setor = string` no `auth-context`; remoção do array `VALID` em `/auth/$setor` e `/app/$setor`, substituído por consulta + 404 se slug não existir/estiver inativo.
- Componentes que hoje fazem `setor === "patrimonio" ? ... : ...` passam a usar `cor_hex` da tabela.

## Não incluído (confirme se quiser)

- Editar nome/cor de setor já criado (só ativar/desativar)
- Excluir setor (perigoso — quebra chamados antigos; melhor desativar)
- Trocar a senha mestra pela UI (precisa atualizar o secret manualmente por enquanto)
