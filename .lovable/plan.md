## Objetivo

Adicionar no `/painel-mestre` (já protegido pela senha mestra) a capacidade de gerenciar contas **admin** de qualquer setor receptor: listar, criar novos admins e redefinir a senha de admins existentes.

## Mudanças

### 1. Novas server functions em `src/lib/setores-receptores.functions.ts`
Todas exigem `senha` mestra (mesma checagem `checkPassword` já existente, usando `supabaseAdmin`):

- `listarAdminsSetor({ senha, slug })` → lista perfis com `role = 'admin'` e `setor = slug` (id, full_name, email).
- `criarAdminSetor({ senha, slug, email, password, full_name? })`
  - Valida slug existe em `setores_receptores`.
  - `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })`.
  - Insere em `perfis` com `role='admin'`, `setor=slug`, `ativo=true`.
- `redefinirSenhaAdmin({ senha, userId, novaSenha })`
  - Confere que o perfil alvo tem `role='admin'` (segurança: a senha mestra só mexe em admins, nunca em usuários comuns).
  - `supabaseAdmin.auth.admin.updateUserById(userId, { password: novaSenha })`.

Validação Zod: senha mín. 8 caracteres, email válido, slug curto.

### 2. UI em `src/routes/painel-mestre.tsx`
Novo card **"Administradores"** abaixo da lista de setores. Para cada setor receptor exibido em `ListaSetoresCard` (ou em um novo card dedicado):

- Botão "Gerenciar admins" abre um `Dialog` mostrando:
  - Lista de admins do setor (nome + email) com botão "Redefinir senha" → prompt inline (input + confirmar).
  - Formulário "Criar novo admin": campos `Nome`, `E-mail`, `Senha` + botão criar.
- Toasts de sucesso/erro; refetch da lista após cada ação.

Sem mudanças de banco, sem mudanças de RLS (tudo passa pelo `supabaseAdmin` no servidor após validar a senha mestra).

## Fora do escopo
- Excluir admin / rebaixar para usuário comum.
- Redefinir senha de usuários não-admin (continua sendo função do admin do setor pelo painel normal).
- Recuperação de senha por e-mail.

Confirma esse escopo?
