import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Send, Search, LogIn, FileText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSetoresReceptores, corStyleSetor } from "@/lib/setores-receptores";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const navigate = useNavigate();
  const [os, setOs] = useState("");
  const { data: setores } = useSetoresReceptores();

  const acompanhar = (e: React.FormEvent) => {
    e.preventDefault();
    const v = os.trim();
    if (!v) return;
    navigate({ to: "/acompanhar", search: { os: v } });
  };

  const nomesSetores = (setores ?? []).map((s) => s.nome).join(" / ") || "diversos setores";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/40">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <header className="text-center mb-12">
          <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-3">
            Central de Chamados
          </p>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">HelpDesk</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Abra um chamado ou acompanhe uma solicitação existente.
          </p>
        </header>

        <div className="grid sm:grid-cols-2 gap-6">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="size-12 rounded-lg bg-primary text-primary-foreground grid place-items-center mb-2">
                <Send className="size-6" />
              </div>
              <CardTitle>Abrir Chamado</CardTitle>
              <CardDescription>
                Registre uma nova solicitação para {nomesSetores}. Sem necessidade de login.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" size="lg">
                <Link to="/abrir">
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
          <div className="flex flex-wrap gap-2 items-center justify-center">
            <span className="text-muted-foreground">Equipe interna:</span>
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
