import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSetoresReceptores, useSetorReceptor, corStyleSetor, nomeSetor } from "@/lib/setores-receptores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Copy, Layers, Loader2, Send } from "lucide-react";

import { z } from "zod";
import { useHospitalSelecionado } from "@/lib/hospitais";
import { Select, SelectContent as SC, SelectItem as SI, SelectTrigger as ST, SelectValue as SV } from "@/components/ui/select";
import { Building2 } from "lucide-react";

const searchSchema = z.object({ hospital: z.string().uuid().optional() });

export const Route = createFileRoute("/abrir")({
  component: AbrirPage,
  validateSearch: (search) => searchSchema.parse(search),
});

function AbrirPage() {
  const searchParams = Route.useSearch();
  const navigate = Route.useNavigate();
  const { hospitais, hospitalId: selecionado, setHospitalId } = useHospitalSelecionado();
  const hospitalId = searchParams.hospital ?? selecionado;
  const [setor, setSetor] = useState<string | null>(null);
  const { data: setores, isLoading } = useSetoresReceptores({ hospitalId });

  const hospitalAtual = hospitais.find((h) => h.id === hospitalId) ?? null;

  const trocarHospital = (id: string) => {
    setHospitalId(id);
    setSetor(null);
    navigate({ search: { hospital: id } });
  };

  return (
    <div className="min-h-screen px-4 py-10 bg-gradient-to-br from-background to-accent/40">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="size-4" /> Voltar
        </Link>

        {hospitais.length > 1 && (
          <div className="mb-4 rounded-lg border-2 p-3 bg-card flex items-center gap-3">
            <Building2 className="size-5 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Hospital</p>
              <Select value={hospitalId ?? undefined} onValueChange={trocarHospital}>
                <ST className="border-0 shadow-none px-0 h-auto font-semibold [&>svg]:opacity-60">
                  <SV placeholder="Selecione" />
                </ST>
                <SC>
                  {hospitais.map((h) => (
                    <SI key={h.id} value={h.id}>{h.nome}</SI>
                  ))}
                </SC>
              </Select>
            </div>
          </div>
        )}

        {!hospitalId ? (
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Selecione um hospital</CardTitle>
              <CardDescription>Escolha o hospital na tela inicial para abrir um chamado.</CardDescription>
            </CardHeader>
          </Card>
        ) : !setor ? (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">
                Para qual setor é o chamado?
              </CardTitle>
              <CardDescription>
                {hospitalAtual ? `${hospitalAtual.nome} · ` : ""}Selecione a área responsável pela sua solicitação.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              {isLoading ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : !setores?.length ? (
                <p className="text-sm text-muted-foreground col-span-full">
                  Nenhum setor disponível neste hospital.
                </p>
              ) : (
                setores.map((s) => (
                  <SetorPick key={s.slug} setor={s} onClick={() => setSetor(s.slug)} />
                ))
              )}
            </CardContent>
          </Card>
        ) : (
          <ChamadoForm setor={setor} onBack={() => setSetor(null)} />
        )}
      </div>
    </div>
  );
}

function SetorPick({ setor, onClick }: { setor: { slug: string; nome: string; cor_hex: string; cor_fg_hex: string }; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border-2 p-6 text-left hover:shadow-md transition-all hover:border-primary/40"
    >
      <div
        className="size-14 rounded-lg grid place-items-center mb-3"
        style={{ backgroundColor: setor.cor_hex, color: setor.cor_fg_hex }}
      >
        <Layers className="size-7" />
      </div>
      <h3 className="text-lg font-semibold">{setor.nome}</h3>
      <p className="text-sm text-muted-foreground mt-1">Abrir chamado para {setor.nome}.</p>
    </button>
  );
}

function ChamadoForm({ setor, onBack }: { setor: string; onBack: () => void }) {
  const { data: receptor } = useSetorReceptor(setor);
  const [nome, setNome] = useState("");
  const [solicitanteSetor, setSolicitanteSetor] = useState("");
  const [ramal, setRamal] = useState("");
  const [descricao, setDescricao] = useState("");
  const [busy, setBusy] = useState(false);
  const [numeroOs, setNumeroOs] = useState<string | null>(null);

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
        user_id: null,
      })
      .select("numero_os")
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    setNumeroOs((data as any)?.numero_os ?? null);
  };

  const resetForm = () => {
    setNome(""); setSolicitanteSetor(""); setRamal(""); setDescricao(""); setNumeroOs(null);
  };

  if (numeroOs) {
    return (
      <Card className="border-2">
        <CardContent className="py-10 text-center space-y-5">
          <CheckCircle2 className="size-14 text-success mx-auto" />
          <div>
            <h3 className="text-2xl font-bold">Chamado registrado!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Guarde o número da OS abaixo para acompanhar sua solicitação.
            </p>
          </div>
          <div className="mx-auto max-w-sm rounded-xl border-2 border-primary/40 bg-primary/5 p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Número da OS</p>
            <p className="text-3xl font-bold font-mono tracking-wider text-primary">{numeroOs}</p>
            <Button
              variant="outline" size="sm" className="mt-3"
              onClick={() => { navigator.clipboard.writeText(numeroOs); toast.success("Copiado!"); }}
            >
              <Copy className="size-3.5 mr-1.5" /> Copiar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use o número acima na opção <strong>Acompanhar meu chamado</strong> na tela inicial.
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <Button variant="outline" onClick={resetForm}>Abrir outro chamado</Button>
            <Button asChild><Link to="/">Voltar ao início</Link></Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="size-4 mr-1" /> Trocar setor
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-lg grid place-items-center" style={corStyleSetor(receptor)}>
            <Layers className="size-6" />
          </div>
          <div>
            <CardTitle className="text-xl">Chamado para {nomeSetor(setor, receptor)}</CardTitle>
            <CardDescription>Preencha os dados abaixo para abrir a solicitação.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do solicitante *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Setor do solicitante *</Label>
            {setores && setores.length > 0 ? (
              <Select value={solicitanteSetor} onValueChange={setSolicitanteSetor}>
                <SelectTrigger><SelectValue placeholder="Selecione o setor de origem" /></SelectTrigger>
                <SelectContent>
                  {setores.map((s) => (
                    <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <>
                <Input
                  value={solicitanteSetor}
                  onChange={(e) => setSolicitanteSetor(e.target.value)}
                  placeholder="De onde vem a solicitação"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Nenhum setor cadastrado ainda. Informe manualmente.
                </p>
              </>
            )}
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
          <Button type="submit" disabled={busy} className="w-full" size="lg">
            {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
            Enviar chamado
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
