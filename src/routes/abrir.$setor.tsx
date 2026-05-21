import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setorLabel, type Setor } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react";

const VALID: Setor[] = ["patrimonio", "refrigeracao"];

export const Route = createFileRoute("/abrir/$setor")({
  beforeLoad: ({ params }) => {
    if (!VALID.includes(params.setor as Setor)) throw redirect({ to: "/" });
  },
  component: AbrirPage,
});

function AbrirPage() {
  const { setor } = Route.useParams() as { setor: Setor };
  const [nome, setNome] = useState("");
  const [solicitanteSetor, setSolicitanteSetor] = useState("");
  const [ramal, setRamal] = useState("");
  const [descricao, setDescricao] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const accent = setor === "patrimonio" ? "bg-patrimonio text-patrimonio-foreground" : "bg-refrigeracao text-refrigeracao-foreground";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("chamados").insert({
      setor_destino: setor,
      solicitante_nome: nome,
      solicitante_setor: solicitanteSetor,
      solicitante_ramal: ramal,
      descricao,
      user_id: null as unknown as string,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setDone(true);
    setNome(""); setSolicitanteSetor(""); setRamal(""); setDescricao("");
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10 bg-gradient-to-br from-background to-accent/40">
      <div className="w-full max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <Card className="border-2">
          <CardHeader className="space-y-3">
            <div className={`size-12 rounded-lg ${accent} grid place-items-center text-lg font-bold`}>
              {setor === "patrimonio" ? "P" : "R"}
            </div>
            <div>
              <CardTitle className="text-2xl">Abrir chamado — {setorLabel(setor)}</CardTitle>
              <CardDescription>Você pode abrir um chamado sem fazer login. A equipe responsável receberá sua solicitação.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="text-center space-y-4 py-6">
                <CheckCircle2 className="size-12 text-primary mx-auto" />
                <h3 className="text-lg font-semibold">Chamado enviado com sucesso!</h3>
                <p className="text-sm text-muted-foreground">A equipe de {setorLabel(setor)} foi notificada.</p>
                <div className="flex gap-2 justify-center pt-2">
                  <Button variant="outline" onClick={() => setDone(false)}>Abrir outro chamado</Button>
                  <Button asChild><Link to="/">Voltar ao início</Link></Button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do solicitante</Label>
                    <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Setor do solicitante</Label>
                    <Input value={solicitanteSetor} onChange={(e) => setSolicitanteSetor(e.target.value)} placeholder="De onde vem a solicitação" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Ramal</Label>
                  <Input value={ramal} onChange={(e) => setRamal(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Descrição da solicitação</Label>
                  <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={5} placeholder="Descreva detalhadamente o que precisa..." required />
                </div>
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
                  Enviar chamado
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
