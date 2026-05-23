import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fmtDate, statusColor, statusLabel, type ChamadoStatus } from "@/lib/chamado-utils";
import { setorLabel, type Setor } from "@/lib/auth-context";
import { ArrowLeft, Search, AlertCircle, Loader2 } from "lucide-react";

interface SearchParams { os?: string }

export const Route = createFileRoute("/acompanhar")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({ os: typeof s.os === "string" ? s.os : undefined }),
  component: AcompanharPage,
});

interface Result {
  numero_os: string;
  setor_destino: Setor;
  solicitante_nome: string;
  solicitante_setor: string;
  status: ChamadoStatus;
  descricao: string;
  created_at: string;
  sla_vencimento: string | null;
  solucao: string | null;
  tempo_gasto_minutos: number | null;
  data_resolucao: string | null;
}

function AcompanharPage() {
  const { os: initialOs } = Route.useSearch();
  const navigate = useNavigate();
  const [os, setOs] = useState(initialOs ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const run = async (numero: string) => {
    const v = numero.trim();
    if (!v) return;
    setLoading(true); setError(null); setResult(null); setSearched(true);
    const { data, error } = await (supabase as any).rpc("buscar_chamado_por_os", { p_numero: v });
    setLoading(false);
    if (error) return setError(error.message);
    const row = (data ?? [])[0] as Result | undefined;
    if (!row) return setError("Nenhum chamado encontrado para este número de OS.");
    setResult(row);
  };

  useEffect(() => {
    if (initialOs) run(initialOs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/acompanhar", search: { os: os.trim() } });
    run(os);
  };

  return (
    <div className="min-h-screen px-4 py-10 bg-gradient-to-br from-background to-accent/40">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="size-4" /> Voltar
        </Link>

        <Card className="border-2 mb-5">
          <CardHeader>
            <CardTitle className="text-2xl">Acompanhar chamado</CardTitle>
            <CardDescription>Digite o número da OS recebido na abertura do chamado.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="flex gap-2">
              <Input
                value={os}
                onChange={(e) => setOs(e.target.value)}
                placeholder="OS-2026-00001"
                className="font-mono"
              />
              <Button type="submit" disabled={loading} size="lg">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="py-6 flex items-center gap-3">
              <AlertCircle className="size-5 text-destructive" />
              <p className="text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Número da OS</p>
                  <p className="text-2xl font-bold font-mono text-primary">{result.numero_os}</p>
                </div>
                <Badge className={`${statusColor[result.status]} border`} variant="outline">
                  {statusLabel[result.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Row label="Setor responsável" value={setorLabel(result.setor_destino)} />
              <Row label="Solicitante" value={`${result.solicitante_nome} — ${result.solicitante_setor}`} />
              <Row label="Aberto em" value={fmtDate(result.created_at)} />
              {result.sla_vencimento && <Row label="Prazo SLA" value={fmtDate(result.sla_vencimento)} />}
              <div>
                <p className="text-xs text-muted-foreground">Descrição</p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{result.descricao}</p>
              </div>
              {result.status === "finalizado" && result.solucao && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground">Solução aplicada</p>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{result.solucao}</p>
                  </div>
                  <Row label="Tempo de atendimento" value={`${result.tempo_gasto_minutos ?? 0} minutos`} />
                  {result.data_resolucao && <Row label="Finalizado em" value={fmtDate(result.data_resolucao)} />}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {!result && !error && !loading && !searched && (
          <p className="text-center text-sm text-muted-foreground">Informe o número da OS acima.</p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm border-b pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
