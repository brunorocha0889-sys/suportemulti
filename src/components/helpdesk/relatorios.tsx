import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Setor } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import { fmtDate, statusLabel, isSlaVencido, type ChamadoStatus } from "@/lib/chamado-utils";
import { FileDown, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Row {
  id: string; numero_os: string | null; setor_destino: Setor;
  solicitante_nome: string; solicitante_setor: string;
  solicitante_ramal: string | null; descricao: string;
  status: ChamadoStatus; sla_vencimento: string | null; created_at: string;
}
interface Solucao { chamado_id: string; tempo_gasto_minutos: number; data_resolucao: string }

const COLORS = ["oklch(0.5 0.18 255)", "oklch(0.75 0.16 70)", "oklch(0.65 0.16 150)", "oklch(0.58 0.22 27)", "oklch(0.6 0.2 320)", "oklch(0.7 0.18 200)"];

export function RelatoriosTab({ setor }: { setor: Setor }) {
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 86400000);
  const [from, setFrom] = useState(monthAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [searchUser, setSearchUser] = useState("");
  const [filterSetor, setFilterSetor] = useState<string>("todos");

  const { data: chamados } = useQuery({
    queryKey: ["report-chamados", setor, from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chamados")
        .select("*")
        .eq("setor_destino", setor)
        .gte("created_at", from + "T00:00:00")
        .lte("created_at", to + "T23:59:59")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const { data: solucoes } = useQuery({
    queryKey: ["report-solucoes", setor, from, to, chamados?.length],
    enabled: !!chamados,
    queryFn: async () => {
      if (!chamados?.length) return [] as Solucao[];
      const ids = chamados.map((c) => c.id);
      const { data, error } = await supabase
        .from("solucoes_chamados")
        .select("chamado_id, tempo_gasto_minutos, data_resolucao")
        .in("chamado_id", ids);
      if (error) throw error;
      return (data ?? []) as Solucao[];
    },
  });

  const setoresUnicos = useMemo(
    () => Array.from(new Set((chamados ?? []).map((c) => c.solicitante_setor).filter(Boolean))).sort(),
    [chamados]
  );

  const filtered = useMemo(
    () => (chamados ?? []).filter((c) => {
      if (searchUser && !c.solicitante_nome.toLowerCase().includes(searchUser.toLowerCase())) return false;
      if (filterSetor !== "todos" && c.solicitante_setor !== filterSetor) return false;
      return true;
    }),
    [chamados, searchUser, filterSetor]
  );

  const byStatus = useMemo(() => {
    const acc: Record<string, number> = { aberto: 0, em_andamento: 0, finalizado: 0, atrasado: 0 };
    filtered.forEach((c) => {
      const eff = isSlaVencido(c.sla_vencimento, c.status) && c.status !== "finalizado" ? "atrasado" : c.status;
      acc[eff] = (acc[eff] ?? 0) + 1;
    });
    return Object.entries(acc).map(([k, v]) => ({ name: statusLabel[k as ChamadoStatus], value: v }));
  }, [filtered]);

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((c) => {
      const d = c.created_at.slice(0, 10);
      map.set(d, (map.get(d) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([d, v]) => ({ data: d, chamados: v }));
  }, [filtered]);

  const bySetor = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((c) => map.set(c.solicitante_setor, (map.get(c.solicitante_setor) ?? 0) + 1));
    return Array.from(map.entries())
      .map(([setor, total]) => ({ setor, total }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const tempoMedio = useMemo(() => {
    if (!solucoes?.length) return 0;
    const tot = solucoes.reduce((s, x) => s + x.tempo_gasto_minutos, 0);
    return Math.round(tot / solucoes.length);
  }, [solucoes]);

  const slaStats = useMemo(() => {
    const dentro = filtered.filter((c) => !isSlaVencido(c.sla_vencimento, c.status)).length;
    const fora = filtered.length - dentro;
    return [
      { name: "Dentro do SLA", value: dentro },
      { name: "Fora do SLA", value: fora },
    ];
  }, [filtered]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Relatório de Chamados — ${setor === "patrimonio" ? "Patrimônio" : "Refrigeração"}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Período: ${from} a ${to}${filterSetor !== "todos" ? ` • Setor: ${filterSetor}` : ""}`, 14, 23);
    autoTable(doc, {
      startY: 28,
      head: [["OS", "Data", "Solicitante", "Setor", "Ramal", "Status", "Descrição"]],
      body: filtered.map((c) => [
        c.numero_os ?? "-",
        fmtDate(c.created_at),
        c.solicitante_nome,
        c.solicitante_setor,
        c.solicitante_ramal ?? "-",
        statusLabel[c.status],
        c.descricao.slice(0, 50),
      ]),
      styles: { fontSize: 8 },
    });

    if (bySetor.length) {
      const y = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(12);
      doc.text("Ranking de setores", 14, y);
      autoTable(doc, {
        startY: y + 3,
        head: [["#", "Setor", "Chamados"]],
        body: bySetor.map((r, i) => [i + 1, r.setor, r.total]),
        styles: { fontSize: 9 },
      });
    }

    doc.save(`chamados-${setor}-${from}-${to}.pdf`);
  };

  const exportXLSX = () => {
    const rows = filtered.map((c) => ({
      OS: c.numero_os ?? "",
      Data: fmtDate(c.created_at),
      Solicitante: c.solicitante_nome,
      Setor: c.solicitante_setor,
      Ramal: c.solicitante_ramal ?? "",
      Status: statusLabel[c.status],
      Descrição: c.descricao,
      "SLA Vencimento": c.sla_vencimento ? fmtDate(c.sla_vencimento) : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const ranking = XLSX.utils.json_to_sheet(bySetor.map((r, i) => ({ Posição: i + 1, Setor: r.setor, Chamados: r.total })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chamados");
    XLSX.utils.book_append_sheet(wb, ranking, "Ranking por setor");
    XLSX.writeFile(wb, `chamados-${setor}-${from}-${to}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtre por período, solicitante e setor.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>De</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Até</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Solicitante</Label>
              <Input value={searchUser} onChange={(e) => setSearchUser(e.target.value)} placeholder="Nome..." />
            </div>
            <div className="space-y-1.5">
              <Label>Setor solicitante</Label>
              <Select value={filterSetor} onValueChange={setFilterSetor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {setoresUnicos.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={exportPDF}><FileDown className="size-4 mr-2" /> PDF</Button>
            <Button variant="outline" onClick={exportXLSX}><FileSpreadsheet className="size-4 mr-2" /> Excel</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total no período</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold">{filtered.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Tempo médio (min)</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold">{tempoMedio}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Soluções registradas</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold">{solucoes?.length ?? 0}</p></CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Chamados por período</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="chamados" stroke="oklch(0.5 0.18 255)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Chamados por status</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="oklch(0.5 0.18 255)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chamados por setor solicitante</CardTitle>
            <CardDescription>Volume agrupado por setor de origem.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySetor} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="setor" width={100} />
                <Tooltip />
                <Bar dataKey="total" fill="oklch(0.6 0.2 320)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ranking — Setores que mais abrem chamados</CardTitle>
          </CardHeader>
          <CardContent>
            {bySetor.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados no período.</p>
            ) : (
              <ol className="space-y-2">
                {bySetor.slice(0, 10).map((r, i) => (
                  <li key={r.setor} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <span className="flex items-center gap-3">
                      <span className="size-7 grid place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {i + 1}
                      </span>
                      <span className="font-medium">{r.setor}</span>
                    </span>
                    <span className="text-sm font-semibold">{r.total}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>SLA — Dentro x Fora</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={slaStats} dataKey="value" nameKey="name" outerRadius={100} label>
                  {slaStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
