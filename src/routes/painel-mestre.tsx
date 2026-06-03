import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  verificarSenhaMestra,
  criarSetorReceptor,
  listarSetoresReceptoresAdmin,
  alternarSetorReceptor,
  listarAdminsSetor,
  criarAdminSetor,
  redefinirSenhaAdmin,
} from "@/lib/setores-receptores.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, ShieldCheck, KeyRound, Users } from "lucide-react";

export const Route = createFileRoute("/painel-mestre")({ component: PainelMestre });

interface SetorRow {
  slug: string;
  nome: string;
  cor_hex: string;
  cor_fg_hex: string;
  ativo: boolean;
}

const PRESETS = [
  "#2d4dc1", "#3aa8c1", "#16a34a", "#dc2626", "#ea580c",
  "#9333ea", "#0891b2", "#ca8a04", "#374151", "#be185d",
];

function PainelMestre() {
  const [senha, setSenha] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [busy, setBusy] = useState(false);
  const [setores, setSetores] = useState<SetorRow[]>([]);

  const verificar = useServerFn(verificarSenhaMestra);
  const listar = useServerFn(listarSetoresReceptoresAdmin);

  const refresh = async (s: string) => {
    try {
      const r = await listar({ data: { senha: s } });
      setSetores(r.setores as unknown as SetorRow[]);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao listar setores.");
    }
  };

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senha) return;
    setBusy(true);
    try {
      await verificar({ data: { senha } });
      setAutenticado(true);
      await refresh(senha);
    } catch (err: any) {
      toast.error(err.message ?? "Senha incorreta.");
    } finally {
      setBusy(false);
    }
  };

  if (!autenticado) {
    return (
      <div className="min-h-screen grid place-items-center px-4 bg-gradient-to-br from-background to-accent/40">
        <div className="w-full max-w-sm">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
          <Card className="border-2">
            <CardHeader>
              <div className="size-12 rounded-lg bg-primary text-primary-foreground grid place-items-center mb-2">
                <ShieldCheck className="size-6" />
              </div>
              <CardTitle>Painel Mestre</CardTitle>
              <CardDescription>
                Acesso restrito. Informe a senha mestra para gerenciar os setores
                que recebem chamados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={entrar} className="space-y-4">
                <div className="space-y-2">
                  <Label>Senha mestra</Label>
                  <Input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <KeyRound className="size-4 mr-2" />}
                  Entrar
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground leading-none">HelpDesk</p>
              <h1 className="font-semibold leading-tight">Painel Mestre</h1>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft className="size-4 mr-2" /> Início</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        <NovoSetorCard senha={senha} onCreated={() => refresh(senha)} />
        <ListaSetoresCard senha={senha} setores={setores} onChanged={() => refresh(senha)} />
      </main>
    </div>
  );
}

function NovoSetorCard({ senha, onCreated }: { senha: string; onCreated: () => void }) {
  const [nome, setNome] = useState("");
  const [corHex, setCorHex] = useState("#2d4dc1");
  const [corFg, setCorFg] = useState("#ffffff");
  const [busy, setBusy] = useState(false);
  const [resultado, setResultado] = useState<{ slug: string; adminEmail: string; adminPassword: string } | null>(null);

  const criar = useServerFn(criarSetorReceptor);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nome.trim().length < 2) return toast.error("Informe um nome válido.");
    setBusy(true);
    try {
      const r = await criar({ data: { senha, nome: nome.trim(), cor_hex: corHex, cor_fg_hex: corFg } });
      setResultado(r);
      setNome("");
      toast.success(`Setor "${r.slug}" criado.`);
      onCreated();
    } catch (err: any) {
      toast.error(err.message ?? "Falha ao criar setor.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadastrar novo setor receptor</CardTitle>
        <CardDescription>
          O setor será criado com um usuário Admin padrão. A URL do setor será
          gerada a partir do nome (ex.: "Almoxarifado" → /app/almoxarifado).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do setor</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Almoxarifado, TI, Manutenção..." required />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cor do destaque</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={corHex}
                  onChange={(e) => setCorHex(e.target.value)}
                  className="size-10 rounded-md border cursor-pointer"
                />
                <Input value={corHex} onChange={(e) => setCorHex(e.target.value)} className="font-mono" />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCorHex(c)}
                    className="size-6 rounded-full border-2"
                    style={{ backgroundColor: c, borderColor: corHex === c ? "var(--ring)" : "transparent" }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cor do texto sobre o destaque</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={corFg}
                  onChange={(e) => setCorFg(e.target.value)}
                  className="size-10 rounded-md border cursor-pointer"
                />
                <Input value={corFg} onChange={(e) => setCorFg(e.target.value)} className="font-mono" />
              </div>
              <div className="flex gap-1.5 pt-1">
                <button type="button" onClick={() => setCorFg("#ffffff")} className="size-6 rounded-full border-2 bg-white" />
                <button type="button" onClick={() => setCorFg("#000000")} className="size-6 rounded-full border-2 bg-black" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Pré-visualização:</span>
            <div
              className="rounded-md px-3 py-1.5 font-semibold"
              style={{ backgroundColor: corHex, color: corFg }}
            >
              {nome || "Novo setor"}
            </div>
          </div>

          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
            Criar setor
          </Button>
        </form>

        {resultado && (
          <div className="rounded-lg border-2 border-success/40 bg-success/5 p-4 space-y-1.5">
            <p className="font-semibold text-success">Setor criado com sucesso!</p>
            <p className="text-sm">Identificador: <code className="font-mono">{resultado.slug}</code></p>
            <p className="text-sm">URL: <code className="font-mono">/app/{resultado.slug}</code></p>
            <p className="text-sm">
              Admin padrão: usuário <code className="font-mono">Admin</code> ·
              senha <code className="font-mono">{resultado.adminPassword}</code>
              {" "}(e-mail <code className="font-mono">{resultado.adminEmail}</code>).
            </p>
            <p className="text-xs text-muted-foreground">
              Faça login em <Link to="/auth/$setor" params={{ setor: resultado.slug }} className="underline">/auth/{resultado.slug}</Link> e altere a senha do admin.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ListaSetoresCard({
  senha, setores, onChanged,
}: { senha: string; setores: SetorRow[]; onChanged: () => void }) {
  const alternar = useServerFn(alternarSetorReceptor);

  const toggle = async (s: SetorRow) => {
    try {
      await alternar({ data: { senha, slug: s.slug, ativo: !s.ativo } });
      toast.success(s.ativo ? "Setor desativado." : "Setor ativado.");
      onChanged();
    } catch (err: any) {
      toast.error(err.message ?? "Falha ao atualizar.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Setores cadastrados</CardTitle>
        <CardDescription>
          Desative para esconder o setor da tela inicial sem apagar os chamados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {setores.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum setor cadastrado.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {setores.map((s) => (
              <div key={s.slug} className="flex items-center gap-3 p-3">
                <div
                  className="size-9 rounded-md grid place-items-center text-sm font-bold"
                  style={{ backgroundColor: s.cor_hex, color: s.cor_fg_hex }}
                >
                  {s.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${!s.ativo ? "text-muted-foreground line-through" : ""}`}>{s.nome}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">/{s.slug}</p>
                </div>
                <div className="flex items-center gap-3">
                  <GerenciarAdminsButton senha={senha} slug={s.slug} nome={s.nome} />
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Ativo</Label>
                    <Switch checked={s.ativo} onCheckedChange={() => toggle(s)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
