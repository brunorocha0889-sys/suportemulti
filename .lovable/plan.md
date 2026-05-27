## Objetivo
Permitir que admins pausem o tempo de atendimento de um chamado por falta de peça/equipamento, com motivo registrado, exibido em nova aba "Em espera" e contabilizado no relatório.

## Banco de dados

Nova migration:

1. Adicionar status `em_espera` ao enum `chamado_status`.
2. Adicionar colunas em `chamados`:
   - `pausado_em` timestamptz nullable
   - `motivo_pausa` text nullable
   - `tempo_pausado_minutos` int default 0 (acumulado de pausas anteriores)
3. Atualizar `statusLabel`/`statusColor` em `src/lib/chamado-utils.ts` para incluir `em_espera` (badge âmbar/cinza).
4. Atualizar `isSlaVencido` para somar `tempo_pausado_minutos` + tempo pausado atual ao SLA (ou ignorar SLA enquanto em espera).
5. Sem mudança nas policies (UPDATE já permitido a staff do setor).

## Backend (cálculo de tempo)

No `ChamadoDialog.handleUpdate`, ao finalizar:
- `tempoTotal = (now - created_at)/60000`
- `tempoPausaAtual = pausado_em ? (now - pausado_em)/60000 : 0`
- `tempo_gasto_minutos = max(0, round(tempoTotal - tempo_pausado_minutos - tempoPausaAtual))`

## UI — ChamadoDialog (`src/components/helpdesk/chamado-dialog.tsx`)

- Adicionar opção "Em espera" no Select de status (apenas para admin/staff).
- Quando status = `em_espera`: mostrar Textarea obrigatório "Motivo / peça faltante" → salva em `motivo_pausa`, seta `pausado_em = now()`.
- Ao mudar de `em_espera` → `aberto`/`em_andamento`: acumular `tempo_pausado_minutos += (now - pausado_em)`, limpar `pausado_em` e `motivo_pausa`.
- Exibir banner quando chamado estiver `em_espera`: motivo + "Parado há X min/horas".
- Atualizar cálculo do tempo informativo (descontar pausas).

## UI — Lista e filtros

- `src/routes/app.$setor.tsx`: adicionar opção "Em espera" no Select de filtro de status.
- `src/components/helpdesk/chamado-shared.tsx` (StatsCards / ChamadosList): adicionar card/contagem "Em espera" e badge correspondente.

## Relatórios (`src/components/helpdesk/relatorios.tsx`)

- Nova métrica: total de chamados em espera.
- Tabela/lista "Em espera": nº OS, solicitante, motivo, tempo parado.
- Tempo médio de pausa entre chamados finalizados.
- Tempo de atendimento já desconta pausas (vem direto de `tempo_gasto_minutos`).

## Resumo

```
DB: + status em_espera, colunas pausado_em/motivo_pausa/tempo_pausado_minutos
UI: nova opção no select + banner + filtro + aba/cartão "Em espera"
SLA + tempo de atendimento descontam tempo pausado
Relatórios exibem dados de pausa
```
