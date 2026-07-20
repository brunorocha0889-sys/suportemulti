import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Send, Search, LogIn, FileText, ShieldCheck, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSetoresReceptores } from "@/lib/setores-receptores";
import { useHospitalSelecionado } from "@/lib/hospitais";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const navigate = useNavigate();
  const [os, setOs] = useState("");
  const { hospitais, hospital, hospitalId, setHospitalId } = useHospitalSelecionado();
  const { data: setores } = useSetoresReceptores({ hospitalId });

  const acompanhar = (e: React.FormEvent) => {
    e.preventDefault();
    const v = os.trim();
    if (!v) return;
    navigate({ to: "/acompanhar", search: { os: v } });
  };

  const nomesSetores = (setores ?? []).map((s) => s.nome).join(" / ") || "diversos setores";
  const semHospital = hospitais.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/40 relative">
      <Button
        asChild
        variant="outline"
        size="icon"
        className="fixed top-4 right-4 z-50 shadow-md"
        title="Painel mestre"
      >
        <Link to="/painel-mestre" aria-label="Painel mestre">
          <ShieldCheck className="size-5" />
        </Link>
      </Button>

      <div className="mx-auto max-w-4xl px-6 py-16">
        <header className="text-center mb-10">
          <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-3">
            Central de Chamados
          </p>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">HelpDesk</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Abra um chamado ou acompanhe uma solicitação existente.
          </p>
        </header>

        {/* Seletor de hospital sempre visível */}
        <div className="mx-auto max-w-md mb-10">
          <Card className="border-2">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                  <Building2 className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Hospital</p>
                  {semHospital ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum hospital cadastrado.{" "}
                      <Link to="/painel-mestre" className="underline">Cadastrar</Link>
                    </p>
                  ) : (
                    <Select value={hospitalId ?? undefined} onValueChange={setHospitalId}>
                      <SelectTrigger className="border-0 shadow-none px-0 h-auto text-base font-semibold [&>svg]:opacity-60">
                        <SelectValue placeholder="Selecione um hospital" />
                      </SelectTrigger>
                      <SelectContent>
                        {hospitais.map((h) => (
                          <SelectItem key={h.id} value={h.id}>{h.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="size-12 rounded-lg bg-primary text-primary-foreground grid place-items-center mb-2">
                <Send className="size-6" />
              </div>
              <CardTitle>Abrir Chamado</CardTitle>
              <CardDescription>
                {hospital
                  ? <>Registre uma nova solicitação em <strong>{hospital.nome}</strong> para {nomesSetores}. Sem necessidade de login.</>
                  : "Selecione um hospital para abrir um chamado."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" size="lg" disabled={!hospitalId}>
                <Link to="/abrir" search={hospitalId ? { hospital: hospitalId } : undefined}>
                  <Send className="size-4 mr-2" /> Abrir Chamado
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="size-12 rounded-lg bg-accent text-accent-foreground grid place-items-center mb-2">
                <Search className="size-6" />
              </div>
              <CardTitle>Acompanhar meu chamado</CardTitle>
              <CardDescription>
                Informe o número da OS recebido na abertura para consultar o andamento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={acompanhar} className="flex gap-2">
                <Input
                  value={os}
                  onChange={(e) => setOs(e.target.value)}
                  placeholder="Ex: OS-2026-00001"
                  className="font-mono"
                />
                <Button type="submit" size="lg">
                  <Search className="size-4" />
                </Button>
              </form>
              <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="size-3" /> Guarde sempre o número da OS para consultas futuras.
              </p>
            </CardContent>
          </Card>
        </div>

        <footer className="mt-12 flex flex-col gap-4 items-center justify-center text-sm">
          {hospital && (setores ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2 items-center justify-center">
              <span className="text-muted-foreground">Equipe interna · {hospital.nome}:</span>
              {(setores ?? []).map((s) => (
                <Button asChild key={s.slug} variant="ghost" size="sm">
                  <Link to="/auth/$setor" params={{ setor: s.slug }}>
                    <span
                      className="inline-block size-2.5 rounded-full mr-2"
                      style={{ backgroundColor: s.cor_hex }}
                    />
                    <LogIn className="size-4 mr-1.5" /> {s.nome}
                  </Link>
                </Button>
              ))}
            </div>
          )}
          <Link
            to="/painel-mestre"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
          >
            <ShieldCheck className="size-3" /> Painel mestre
          </Link>
        </footer>
      </div>
    </div>
  );
}
