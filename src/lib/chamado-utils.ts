export type ChamadoStatus = "aberto" | "em_andamento" | "finalizado" | "atrasado";

export const statusLabel: Record<ChamadoStatus, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
  atrasado: "Atrasado",
};

export const statusColor: Record<ChamadoStatus, string> = {
  aberto: "bg-primary/15 text-primary border-primary/30",
  em_andamento: "bg-warning/15 text-warning-foreground border-warning/40",
  finalizado: "bg-success/15 text-success border-success/30",
  atrasado: "bg-destructive/15 text-destructive border-destructive/30",
};

export function isSlaVencido(sla: string | null, status: ChamadoStatus) {
  if (status === "finalizado" || !sla) return false;
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
