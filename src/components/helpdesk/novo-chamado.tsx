import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Setor } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

export function NovoChamadoForm({ setor }: { setor: Setor }) {
  const { user, perfil } = useAuth();
  const qc = useQueryClient();
  const [nome, setNome] = useState(perfil?.full_name ?? "");
  const [solicitanteSetor, setSolicitanteSetor] = useState("");
  const [ramal, setRamal] = useState("");
  const [descricao, setDescricao] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("chamados").insert({
      setor_destino: setor,
      solicitante_nome: nome,
      solicitante_setor: solicitanteSetor,
      solicitante_ramal: ramal,
      descricao,
      user_id: user.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Chamado aberto com sucesso!");
    setSolicitanteSetor("");
    setRamal("");
    setDescricao("");
    qc.invalidateQueries({ queryKey: ["chamados"] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abrir novo chamado</CardTitle>
        <CardDescription>Preencha os dados da solicitação. O setor de destino é definido automaticamente.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do solicitante</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Setor do solicitante</Label>
              <Input
                value={solicitanteSetor}
                onChange={(e) => setSolicitanteSetor(e.target.value)}
                placeholder="De onde vem a solicitação"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Ramal</Label>
            <Input value={ramal} onChange={(e) => setRamal(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Descrição da solicitação</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={5}
              placeholder="Descreva detalhadamente o que precisa..."
              required
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
            Enviar chamado
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
