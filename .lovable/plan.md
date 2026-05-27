## Objetivo
Ao finalizar um chamado, o sistema deve calcular o tempo gasto automaticamente (em minutos, a partir de `created_at` até o momento da finalização). O admin não precisa mais digitar o tempo.

## Alterações

### 1. `src/components/helpdesk/chamado-dialog.tsx`
- Remover o campo de input "Tempo gasto (minutos)" e o estado `tempo`.
- No `handleUpdate`, ao finalizar, calcular:
  ```ts
  const tempoGastoMinutos = Math.max(
    0,
    Math.round((Date.now() - new Date(chamado.created_at).getTime()) / 60000)
  );
  ```
- Inserir esse valor em `solucoes_chamados.tempo_gasto_minutos`.
- Exibir ao admin (antes de salvar) uma linha informativa do tipo "Tempo de atendimento: Xh Ym (calculado automaticamente)".

### 2. SLA
O cálculo de SLA já é automático:
- Trigger `set_chamado_sla` define `sla_vencimento = created_at + horas_resolucao` na criação.
- `isSlaVencido` em `src/lib/chamado-utils.ts` compara com `now()`.
Nenhuma mudança necessária no SLA — apenas confirmar que continua funcionando.

### 3. Sem mudanças de banco
A coluna `tempo_gasto_minutos` continua sendo preenchida, apenas a origem do valor muda (calculada no cliente em vez de digitada). Nenhuma migration necessária.

## Fora de escopo
- Não mexer em RLS nem em outras telas.
- Relatórios continuam usando `tempo_gasto_minutos` como hoje.
