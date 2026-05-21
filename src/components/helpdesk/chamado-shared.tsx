import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Setor } from "@/lib/auth-context";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtDate, isSlaVencido, statusColor, statusLabel, type ChamadoStatus } from "@/lib/chamado-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Inbox, CheckCircle2, Clock } from "lucide-react";

export interface ChamadoRow {
  id: string;
  setor_destino: Setor;
  solicitante_nome: string;
  solicitante_setor: string;
  solicitante_ramal: string;
  descricao: string;
  status: ChamadoStatus;
  user_id: string;
  sla_vencimento: string | null;
  created_at: string;
  updated_at: string;
}

export function useChamados(setor: Setor, scope: "mine" | "sector") {
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["chamados", setor, scope, user?.id],
    enabled: !!user,
    queryFn: async () => {
      let qb = supabase.from("chamados").select("*").eq("setor_destino", setor).order("created_at", { ascending: false });
      if (scope === "mine" && user) qb = qb.eq("user_id", user.id);
      const { data, error } = await qb;
      if (error) throw error;
      return (data ?? []) as ChamadoRow[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`chamados-${setor}-${scope}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chamados" }, () => {
        qc.invalidateQueries({ queryKey: ["chamados", setor, scope] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "solucoes_chamados" }, () => {
        qc.invalidateQueries({ queryKey: ["solucao"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [setor, scope, qc]);

  return q;
}

export function ChamadoCard({ c, onClick }: { c: ChamadoRow; onClick?: () => void }) {
  const vencido = isSlaVencido(c.sla_vencimento, c.status);
  const effectiveStatus: ChamadoStatus = vencido && c.status !== "finalizado" ? "atrasado" : c.status;
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border bg-card p-4 hover:shadow-md transition-all hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-card-foreground">{c.solicitante_nome}</span>
            <span className="text-xs text-muted-foreground">• Ramal {c.solicitante_ramal}</span>
            <span className="text-xs text-muted-foreground">• {c.solicitante_setor}</span>
          </div>
          <p className="mt-1.5 text-sm text-card-foreground line-clamp-2">{c.descricao}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {fmtDate(c.created_at)}
            {c.sla_vencimento && (
              <span className={vencido && effectiveStatus !== "finalizado" ? "text-destructive font-medium" : ""}>
                SLA: {fmtDate(c.sla_vencimento)}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge className={`${statusColor[effectiveStatus]} border`} variant="outline">
            {statusLabel[effectiveStatus]}
          </Badge>
          {vencido && c.status !== "finalizado" && (
            <span className="inline-flex items-center gap-1 text-[10px] text-destructive font-semibold">
              <AlertTriangle className="size-3" /> SLA vencido
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function ChamadosList({
  chamados, loading, emptyText, onSelect,
}: {
  chamados?: ChamadoRow[]; loading: boolean; emptyText: string;
  onSelect?: (c: ChamadoRow) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }
  if (!chamados?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Inbox className="size-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{emptyText}</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {chamados.map((c) => <ChamadoCard key={c.id} c={c} onClick={() => onSelect?.(c)} />)}
    </div>
  );
}

export function StatsCards({ chamados }: { chamados?: ChamadoRow[] }) {
  const total = chamados?.length ?? 0;
  const abertos = chamados?.filter((c) => c.status === "aberto").length ?? 0;
  const andamento = chamados?.filter((c) => c.status === "em_andamento").length ?? 0;
  const finalizados = chamados?.filter((c) => c.status === "finalizado").length ?? 0;
  const atrasados = chamados?.filter((c) => isSlaVencido(c.sla_vencimento, c.status)).length ?? 0;

  const items = [
    { label: "Total", value: total, icon: Inbox, color: "text-primary" },
    { label: "Abertos", value: abertos, icon: Clock, color: "text-primary" },
    { label: "Em andamento", value: andamento, icon: Clock, color: "text-warning" },
    { label: "Finalizados", value: finalizados, icon: CheckCircle2, color: "text-success" },
    { label: "SLA vencido", value: atrasados, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Card key={it.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Icon className={`size-3.5 ${it.color}`} />
                {it.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{it.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
