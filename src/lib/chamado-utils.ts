export type ChamadoStatus = "aberto" | "em_andamento" | "em_espera" | "finalizado" | "atrasado";

export const statusLabel: Record<ChamadoStatus, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  em_espera: "Em espera",
  finalizado: "Finalizado",
  atrasado: "Atrasado",
};

export const statusColor: Record<ChamadoStatus, string> = {
  aberto: "bg-primary/15 text-primary border-primary/30",
  em_andamento: "bg-warning/15 text-warning-foreground border-warning/40",
  em_espera: "bg-muted text-muted-foreground border-border",
  finalizado: "bg-success/15 text-success border-success/30",
  atrasado: "bg-destructive/15 text-destructive border-destructive/30",
};

export function isSlaVencido(sla: string | null, status: ChamadoStatus) {
  if (status === "finalizado" || status === "em_espera" || !sla) return false;
  return new Date(sla).getTime() < Date.now();
}

export function fmtDate(d: string) {
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtMinutes(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h < 24) return r ? `${h}h ${r}min` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}

export function tempoParado(pausado_em: string | null) {
  if (!pausado_em) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(pausado_em).getTime()) / 60000));
}
