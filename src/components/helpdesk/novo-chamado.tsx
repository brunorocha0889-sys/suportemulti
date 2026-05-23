import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Setor } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [lastOs, setLastOs] = useState<string | null>(null);

  const { data: setores } = useQuery({
    queryKey: ["setores-solicitantes", setor],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("setores_solicitantes")
        .select("id, nome, ativo")
        .eq("setor_destino", setor)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string; ativo: boolean }[];
    },
  });

  useEffect(() => {
    if (setores && setores.length === 1 && !solicitanteSetor) {
      setSolicitanteSetor(setores[0].nome);
    }
  }, [setores, solicitanteSetor]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!nome.trim() || !solicitanteSetor || !descricao.trim()) {
      return toast.error("Preencha todos os campos obrigatórios.");
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("chamados")
      .insert({
        setor_destino: setor,
        solicitante_nome: nome.trim(),
        solicitante_setor: solicitanteSetor,
        solicitante_ramal: ramal.trim() || null,
        descricao: descricao.trim(),
        user_id: user.id,
      })
      .select("numero_os")
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    const os = (data as any)?.numero_os ?? null;
    setLastOs(os);
    toast.success(os ? `Chamado ${os} aberto!` : "Chamado aberto.");
    setSolicitanteSetor(setores && setores.length === 1 ? setores[0].nome : "");
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
        {lastOs && (
          <div className="mb-4 rounded-lg border-2 border-primary/40 bg-primary/5 p-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Última OS gerada</p>
            <p className="text-lg font-bold font-mono text-primary">{lastOs}</p>
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do solicitante *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Setor do solicitante *</Label>
              {setores && setores.length > 0 ? (
                <Select value={solicitanteSetor} onValueChange={setSolicitanteSetor}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {setores.map((s) => (
                      <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={solicitanteSetor}
                  onChange={(e) => setSolicitanteSetor(e.target.value)}
                  placeholder="De onde vem a solicitação"
                  required
                />
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Ramal</Label>
            <Input value={ramal} onChange={(e) => setRamal(e.target.value)} />
            <p className="text-xs text-muted-foreground">Caso não possua ramal, deixe este campo em branco.</p>
          </div>
          <div className="space-y-2">
            <Label>Descrição da solicitação *</Label>
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
