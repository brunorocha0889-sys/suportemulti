import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { ChamadoRow } from "./chamado-shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fmtDate, fmtMinutes, statusColor, statusLabel, tempoParado, type ChamadoStatus } from "@/lib/chamado-utils";
import { toast } from "sonner";
import { Loader2, PauseCircle } from "lucide-react";

interface Solucao {
  id: string;
  chamado_id: string;
  descricao_solucao: string;
  tempo_gasto_minutos: number;
  data_resolucao: string;
}

export function ChamadoDialog({
  chamado, open, onOpenChange, canManage,
}: {
  chamado: ChamadoRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  canManage: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState<ChamadoStatus>("aberto");
  const [solucao, setSolucao] = useState("");
  const [motivoPausa, setMotivoPausa] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (chamado) {
      setStatus(chamado.status);
      setSolucao("");
      setMotivoPausa(chamado.motivo_pausa ?? "");
    }
  }, [chamado]);

  const { data: solucoes } = useQuery({
    queryKey: ["solucao", chamado?.id],
    enabled: !!chamado,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solucoes_chamados")
        .select("*")
        .eq("chamado_id", chamado!.id)
        .order("data_resolucao", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Solucao[];
    },
  });

  if (!chamado) return null;

  const pausaAtual = tempoParado(chamado.pausado_em);
  const totalPausado = (chamado.tempo_pausado_minutos ?? 0) + pausaAtual;
  const tempoTotal = Math.max(0, Math.round((Date.now() - new Date(chamado.created_at).getTime()) / 60000));
  const tempoAtendimento = Math.max(0, tempoTotal - totalPausado);

  const handleUpdate = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const update: Record<string, unknown> = { status };

      // Transição para em_espera
      if (status === "em_espera" && chamado.status !== "em_espera") {
        if (!motivoPausa.trim()) {
          toast.error("Informe o motivo da pausa (peça/equipamento faltante).");
          setBusy(false);
          return;
        }
        update.pausado_em = new Date().toISOString();
        update.motivo_pausa = motivoPausa.trim();
      }

      // Saída de em_espera (para outro status que não em_espera)
      if (chamado.status === "em_espera" && status !== "em_espera") {
        update.tempo_pausado_minutos = (chamado.tempo_pausado_minutos ?? 0) + pausaAtual;
        update.pausado_em = null;
        update.motivo_pausa = null;
      }

      // Atualizar motivo enquanto continua em espera
      if (status === "em_espera" && chamado.status === "em_espera" && motivoPausa.trim() !== (chamado.motivo_pausa ?? "")) {
        if (!motivoPausa.trim()) {
          toast.error("Informe o motivo da pausa.");
          setBusy(false);
          return;
        }
        update.motivo_pausa = motivoPausa.trim();
      }

      if (status === "finalizado") {
        if (!solucao.trim()) {
          toast.error("Informe a solução aplicada para finalizar.");
          setBusy(false);
          return;
        }
        const { error: sErr } = await supabase.from("solucoes_chamados").insert({
          chamado_id: chamado.id,
          admin_id: user.id,
          descricao_solucao: solucao,
          tempo_gasto_minutos: tempoAtendimento,
        });
        if (sErr) throw sErr;
      }

      const { error } = await supabase.from("chamados").update(update).eq("id", chamado.id);
      if (error) throw error;
      toast.success("Chamado atualizado.");
      qc.invalidateQueries({ queryKey: ["chamados"] });
      qc.invalidateQueries({ queryKey: ["solucao", chamado.id] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao atualizar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {chamado.numero_os && (
              <span className="text-xs font-mono font-semibold px-2 py-1 rounded bg-primary/10 text-primary">
                {chamado.numero_os}
              </span>
            )}
            {chamado.solicitante_nome}
          </DialogTitle>
          <DialogDescription>Aberto em {fmtDate(chamado.created_at)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge className={`${statusColor[chamado.status]} border`} variant="outline">
              {statusLabel[chamado.status]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {chamado.solicitante_ramal ? `Ramal ${chamado.solicitante_ramal} • ` : ""}
              {chamado.solicitante_setor}
            </span>
          </div>

          {chamado.status === "em_espera" && chamado.pausado_em && (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <PauseCircle className="size-4" /> Chamado em espera
              </div>
              <p className="mt-1 text-xs">
                <strong>Motivo:</strong> {chamado.motivo_pausa ?? "—"}
              </p>
              <p className="text-xs">
                <strong>Parado há:</strong> {fmtMinutes(pausaAtual)}
              </p>
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground">Descrição</Label>
            <p className="mt-1 text-sm whitespace-pre-wrap">{chamado.descricao}</p>
          </div>

          {chamado.sla_vencimento && (
            <div className="text-xs text-muted-foreground">SLA: {fmtDate(chamado.sla_vencimento)}</div>
          )}

          {(chamado.tempo_pausado_minutos ?? 0) > 0 && (
            <div className="text-xs text-muted-foreground">
              Tempo total já pausado: {fmtMinutes(chamado.tempo_pausado_minutos)}
            </div>
          )}

          {solucoes && solucoes.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Solução registrada</Label>
                {solucoes.map((s) => (
                  <div key={s.id} className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-sm whitespace-pre-wrap">{s.descricao_solucao}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Tempo: {s.tempo_gasto_minutos} min • {fmtDate(s.data_resolucao)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          {canManage && chamado.status !== "finalizado" && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Atualizar status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ChamadoStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="em_andamento">Em andamento</SelectItem>
                      <SelectItem value="em_espera">Em espera (pausar tempo)</SelectItem>
                      <SelectItem value="finalizado">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {status === "em_espera" && (
                  <div className="space-y-2">
                    <Label>Motivo da pausa / peça faltante</Label>
                    <Textarea
                      value={motivoPausa}
                      onChange={(e) => setMotivoPausa(e.target.value)}
                      rows={3}
                      placeholder="Ex: Aguardando compressor 1.5HP"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      O tempo de atendimento será congelado enquanto o chamado estiver em espera.
                    </p>
                  </div>
                )}

                {status === "finalizado" && (
                  <>
                    <div className="space-y-2">
                      <Label>Solução aplicada</Label>
                      <Textarea value={solucao} onChange={(e) => setSolucao(e.target.value)} rows={4} required />
                    </div>
                    <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground space-y-0.5">
                      <div>Tempo total decorrido: <strong>{fmtMinutes(tempoTotal)}</strong></div>
                      {totalPausado > 0 && <div>Tempo pausado: <strong>{fmtMinutes(totalPausado)}</strong></div>}
                      <div>Tempo de atendimento (será registrado): <strong>{fmtMinutes(tempoAtendimento)}</strong></div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {canManage && chamado.status !== "finalizado" && (
          <DialogFooter>
            <Button onClick={handleUpdate} disabled={busy}>
              {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
              Salvar alterações
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
