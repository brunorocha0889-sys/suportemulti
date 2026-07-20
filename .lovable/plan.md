## Notificação sonora + popup para novos chamados

Quando um novo chamado chegar no setor do usuário logado, tocar um som e exibir um popup (toast). Funciona apenas na área autenticada (`/app/$setor`), nunca em rotas públicas.

### Comportamento
- Som curto (~0.3s, tipo "ding") tocado via Web Audio API — sem precisar de arquivo de áudio externo.
- Toast (sonner) com número da OS, solicitante e botão "Abrir" que rola/abre o chamado.
- Dispara apenas para chamados cujo `setor_destino` = setor do usuário logado.
- Ignora o primeiro carregamento (só toca em INSERTs que chegam depois do mount).
- Respeita política de autoplay do browser: na 1ª interação do usuário com a página, destrava o AudioContext. Se ainda estiver bloqueado, mostra só o toast.

### Mudanças técnicas
1. **Migration**: habilitar Realtime na tabela `chamados`
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE public.chamados;
   ```
2. **Novo hook** `src/hooks/use-novo-chamado-notification.ts`:
   - Recebe `setor` (slug do setor logado).
   - `useEffect` cria channel Supabase `postgres_changes` event=`INSERT`, filter=`setor_destino=eq.{setor}`.
   - No callback: toca beep (Web Audio oscillator) + `toast()` do sonner com ação "Abrir".
   - Cleanup com `supabase.removeChannel`.
   - Hook de unlock: listener `pointerdown` único em `window` que faz `audioCtx.resume()`.
3. **Integração em `src/routes/app.$setor.tsx`**: chamar o hook passando o setor atual; invalida a query da lista de chamados para a UI atualizar junto.

### Pontos de confirmação
- Som via Web Audio (sem asset) — ok? Alternativa: subir um `.mp3` curto como asset.
- Volume/duração: beep curto padrão; podemos ajustar.
