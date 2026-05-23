import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { ChamadoRow } from "./chamado-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fmtDate, statusColor, statusLabel, type ChamadoStatus } from "@/lib/chamado-utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  const [tempo, setTempo] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (chamado) {
      setStatus(chamado.status);
      setSolucao("");
      setTempo(0);
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

  const handleUpdate = async () => {
    if (!user) return;
    setBusy(true);
    try {
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
          tempo_gasto_minutos: Number(tempo) || 0,
        });
        if (sErr) throw sErr;
      }
      const { error } = await supabase.from("chamados").update({ status }).eq("id", chamado.id);
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

          <div>
            <Label className="text-xs text-muted-foreground">Descrição</Label>
            <p className="mt-1 text-sm whitespace-pre-wrap">{chamado.descricao}</p>
          </div>

          {chamado.sla_vencimento && (
            <div className="text-xs text-muted-foreground">SLA: {fmtDate(chamado.sla_vencimento)}</div>
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
                      <SelectItem value="finalizado">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {status === "finalizado" && (
                  <>
                    <div className="space-y-2">
                      <Label>Solução aplicada</Label>
                      <Textarea value={solucao} onChange={(e) => setSolucao(e.target.value)} rows={4} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Tempo gasto (minutos)</Label>
                      <Input type="number" min={0} value={tempo} onChange={(e) => setTempo(Number(e.target.value))} />
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
