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
  excluirSetorReceptor,
  listarHospitaisAdmin,
  criarHospital,
  alternarHospital,
  renomearHospital,
  excluirHospital,
} from "@/lib/setores-receptores.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, ShieldCheck, KeyRound, Users, Trash2, Building2, Pencil } from "lucide-react";

export const Route = createFileRoute("/painel-mestre")({ component: PainelMestre });

interface HospitalRow { id: string; slug: string; nome: string; ativo: boolean }
interface SetorRow {
  slug: string;
  nome: string;
  cor_hex: string;
  cor_fg_hex: string;
  ativo: boolean;
  hospital_id: string;
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
  const [hospitais, setHospitais] = useState<HospitalRow[]>([]);

  const verificar = useServerFn(verificarSenhaMestra);
  const listarSetores = useServerFn(listarSetoresReceptoresAdmin);
  const listarHosp = useServerFn(listarHospitaisAdmin);

  const refresh = async (s: string) => {
    try {
      const [rs, rh] = await Promise.all([
        listarSetores({ data: { senha: s } }),
        listarHosp({ data: { senha: s } }),
      ]);
      setSetores(rs.setores as unknown as SetorRow[]);
      setHospitais(rh.hospitais as unknown as HospitalRow[]);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao carregar dados.");
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
                Acesso restrito. Informe a senha mestra para gerenciar hospitais e
                setores.
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

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Hospitais</h2>
          </div>
          <NovoHospitalCard senha={senha} onCreated={() => refresh(senha)} />
          <ListaHospitaisCard senha={senha} hospitais={hospitais} setores={setores} onChanged={() => refresh(senha)} />
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Setores receptores</h2>
          </div>
          <NovoSetorCard senha={senha} hospitais={hospitais} onCreated={() => refresh(senha)} />
          <ListaSetoresCard senha={senha} setores={setores} hospitais={hospitais} onChanged={() => refresh(senha)} />
        </section>
      </main>
    </div>
  );
}

// Ícone extra (evita novo import)
function Layers(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
    </svg>
  );
}

/* ==================== HOSPITAIS ==================== */

function NovoHospitalCard({ senha, onCreated }: { senha: string; onCreated: () => void }) {
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);
  const criar = useServerFn(criarHospital);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nome.trim().length < 2) return toast.error("Informe um nome válido.");
    setBusy(true);
    try {
      const r = await criar({ data: { senha, nome: nome.trim() } });
      setNome("");
      toast.success(`Hospital "${r.nome}" cadastrado.`);
      onCreated();
    } catch (err: any) {
      toast.error(err.message ?? "Falha ao criar hospital.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cadastrar novo hospital</CardTitle>
        <CardDescription>
          Cada hospital tem seus próprios setores, chamados e administradores.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Hospital Regional, Santa Casa..."
            required
          />
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
            Cadastrar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ListaHospitaisCard({
  senha, hospitais, setores, onChanged,
}: { senha: string; hospitais: HospitalRow[]; setores: SetorRow[]; onChanged: () => void }) {
  const alternar = useServerFn(alternarHospital);
  const renomear = useServerFn(renomearHospital);
  const excluir = useServerFn(excluirHospital);
  const [editing, setEditing] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [deleting, setDeleting] = useState<HospitalRow | null>(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = async (h: HospitalRow) => {
    try {
      await alternar({ data: { senha, id: h.id, ativo: !h.ativo } });
      toast.success(h.ativo ? "Hospital desativado." : "Hospital ativado.");
      onChanged();
    } catch (err: any) {
      toast.error(err.message ?? "Falha ao atualizar.");
    }
  };

  const salvarNome = async (h: HospitalRow) => {
    if (editNome.trim().length < 2) return toast.error("Nome inválido.");
    try {
      await renomear({ data: { senha, id: h.id, nome: editNome.trim() } });
      toast.success("Hospital renomeado.");
      setEditing(null);
      onChanged();
    } catch (err: any) {
      toast.error(err.message ?? "Falha ao renomear.");
    }
  };

  const confirmarExclusao = async () => {
    if (!deleting) return;
    if (confirm !== deleting.nome && confirm !== deleting.slug) {
      return toast.error("Confirmação incorreta.");
    }
    setBusy(true);
    try {
      await excluir({ data: { senha, id: deleting.id, confirmacao: confirm } });
      toast.success(`Hospital "${deleting.nome}" excluído.`);
      setDeleting(null); setConfirm("");
      onChanged();
    } catch (err: any) {
      toast.error(err.message ?? "Falha ao excluir.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hospitais cadastrados</CardTitle>
        <CardDescription>
          Desative para ocultar da tela inicial. Excluir remove todos os dados vinculados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hospitais.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum hospital cadastrado.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {hospitais.map((h) => {
              const nSetores = setores.filter((s) => s.hospital_id === h.id).length;
              const isEditing = editing === h.id;
              return (
                <div key={h.id} className="flex items-center gap-3 p-3">
                  <div className="size-9 rounded-md grid place-items-center bg-primary/10 text-primary">
                    <Building2 className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} autoFocus />
                        <Button size="sm" onClick={() => salvarNome(h)}>Salvar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
                      </div>
                    ) : (
                      <>
                        <p className={`font-medium ${!h.ativo ? "text-muted-foreground line-through" : ""}`}>{h.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {nSetores} {nSetores === 1 ? "setor" : "setores"} · <code className="font-mono">{h.slug}</code>
                        </p>
                      </>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-3">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(h.id); setEditNome(h.nome); }}>
                        <Pencil className="size-4" />
                      </Button>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Ativo</Label>
                        <Switch checked={h.ativo} onCheckedChange={() => toggle(h)} />
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => { setDeleting(h); setConfirm(""); }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!deleting} onOpenChange={(o) => { if (!o) { setDeleting(null); setConfirm(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir hospital "{deleting?.nome}"?</DialogTitle>
            <DialogDescription>
              Esta ação é <strong>permanente</strong> e remove todos os setores,
              chamados, soluções, usuários e configurações vinculados a este
              hospital.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">
              Para confirmar, digite o nome do hospital <code className="font-mono">{deleting?.nome}</code>:
            </Label>
            <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoFocus />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={busy || (confirm !== deleting?.nome && confirm !== deleting?.slug)}
              onClick={confirmarExclusao}
            >
              {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Trash2 className="size-4 mr-2" />}
              Excluir permanentemente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ==================== SETORES ==================== */

function NovoSetorCard({
  senha, hospitais, onCreated,
}: { senha: string; hospitais: HospitalRow[]; onCreated: () => void }) {
  const [nome, setNome] = useState("");
  const [hospitalId, setHospitalId] = useState<string>("");
  const [corHex, setCorHex] = useState("#2d4dc1");
  const [corFg, setCorFg] = useState("#ffffff");
  const [busy, setBusy] = useState(false);
  const [resultado, setResultado] = useState<{ slug: string; adminEmail: string; adminPassword: string } | null>(null);

  const criar = useServerFn(criarSetorReceptor);

  useEffect(() => {
    if (!hospitalId && hospitais.length > 0) {
      const primeiroAtivo = hospitais.find((h) => h.ativo) ?? hospitais[0];
      setHospitalId(primeiroAtivo.id);
    }
  }, [hospitais, hospitalId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalId) return toast.error("Selecione um hospital.");
    if (nome.trim().length < 2) return toast.error("Informe um nome válido.");
    setBusy(true);
    try {
      const r = await criar({ data: { senha, hospital_id: hospitalId, nome: nome.trim(), cor_hex: corHex, cor_fg_hex: corFg } });
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
        <CardTitle className="text-base">Cadastrar novo setor receptor</CardTitle>
        <CardDescription>
          O setor é vinculado a um hospital e criado com um usuário Admin padrão.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hospital</Label>
              <Select value={hospitalId} onValueChange={setHospitalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o hospital" />
                </SelectTrigger>
                <SelectContent>
                  {hospitais.map((h) => (
                    <SelectItem key={h.id} value={h.id}>{h.nome}{!h.ativo ? " (inativo)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hospitais.length === 0 && (
                <p className="text-xs text-destructive">Cadastre um hospital antes de criar setores.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Nome do setor</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: TI, Manutenção..." required />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cor do destaque</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={corHex} onChange={(e) => setCorHex(e.target.value)} className="size-10 rounded-md border cursor-pointer" />
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
                <input type="color" value={corFg} onChange={(e) => setCorFg(e.target.value)} className="size-10 rounded-md border cursor-pointer" />
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
            <div className="rounded-md px-3 py-1.5 font-semibold" style={{ backgroundColor: corHex, color: corFg }}>
              {nome || "Novo setor"}
            </div>
          </div>

          <Button type="submit" disabled={busy || !hospitalId}>
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
  senha, setores, hospitais, onChanged,
}: { senha: string; setores: SetorRow[]; hospitais: HospitalRow[]; onChanged: () => void }) {
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

  // Agrupa setores por hospital
  const grupos = hospitais.map((h) => ({
    hospital: h,
    setores: setores.filter((s) => s.hospital_id === h.id),
  }));
  const orfaos = setores.filter((s) => !hospitais.some((h) => h.id === s.hospital_id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Setores cadastrados</CardTitle>
        <CardDescription>
          Desative para esconder o setor da tela inicial sem apagar os chamados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {grupos.length === 0 && orfaos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum setor cadastrado.</p>
        ) : (
          grupos.map(({ hospital, setores: lista }) => (
            <div key={hospital.id} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Building2 className="size-4" /> {hospital.nome}
                <span className="text-xs font-normal">
                  ({lista.length} {lista.length === 1 ? "setor" : "setores"})
                </span>
              </div>
              {lista.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-6">Nenhum setor neste hospital.</p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {lista.map((s) => (
                    <SetorRowView key={s.slug} s={s} senha={senha} onChanged={onChanged} onToggle={() => toggle(s)} />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function SetorRowView({
  s, senha, onChanged, onToggle,
}: { s: SetorRow; senha: string; onChanged: () => void; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3">
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
          <Switch checked={s.ativo} onCheckedChange={onToggle} />
        </div>
        <ExcluirSetorButton senha={senha} slug={s.slug} nome={s.nome} onDeleted={onChanged} />
      </div>
    </div>
  );
}

/* ==================== ADMINS ==================== */

interface AdminRow { id: string; full_name: string; email: string; ativo: boolean }

function GerenciarAdminsButton({ senha, slug, nome }: { senha: string; slug: string; nome: string }) {
  const [open, setOpen] = useState(false);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [busyCreate, setBusyCreate] = useState(false);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [busyReset, setBusyReset] = useState(false);

  const listar = useServerFn(listarAdminsSetor);
  const criar = useServerFn(criarAdminSetor);
  const redefinir = useServerFn(redefinirSenhaAdmin);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await listar({ data: { senha, slug } });
      setAdmins(r.admins as AdminRow[]);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao listar admins.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  const submitNovo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 8) return toast.error("Senha deve ter ao menos 8 caracteres.");
    setBusyCreate(true);
    try {
      await criar({ data: { senha, slug, email: newEmail.trim(), password: newPwd, full_name: newNome.trim() } });
      toast.success("Admin criado.");
      setNewNome(""); setNewEmail(""); setNewPwd(""); setNewOpen(false);
      refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Falha ao criar admin.");
    } finally {
      setBusyCreate(false);
    }
  };

  const submitReset = async (userId: string) => {
    if (resetPwd.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres.");
    setBusyReset(true);
    try {
      await redefinir({ data: { senha, userId, novaSenha: resetPwd } });
      toast.success("Senha redefinida.");
      setResetFor(null); setResetPwd("");
    } catch (err: any) {
      toast.error(err.message ?? "Falha ao redefinir senha.");
    } finally {
      setBusyReset(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Users className="size-4 mr-2" /> Admins
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Administradores · {nome}</DialogTitle>
          <DialogDescription>
            Crie novas contas admin ou redefina a senha das contas existentes deste setor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border divide-y">
            {loading ? (
              <div className="p-4 flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="size-4 mr-2 animate-spin" /> Carregando…
              </div>
            ) : admins.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhum admin cadastrado.</p>
            ) : (
              admins.map((a) => (
                <div key={a.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{a.full_name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{a.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setResetFor(resetFor === a.id ? null : a.id); setResetPwd(""); }}
                    >
                      <KeyRound className="size-4 mr-2" />
                      {resetFor === a.id ? "Cancelar" : "Redefinir senha"}
                    </Button>
                  </div>
                  {resetFor === a.id && (
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="Nova senha (mín. 6)"
                        value={resetPwd}
                        onChange={(e) => setResetPwd(e.target.value)}
                      />
                      <Button size="sm" disabled={busyReset} onClick={() => submitReset(a.id)}>
                        {busyReset ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {!newOpen ? (
            <Button variant="outline" onClick={() => setNewOpen(true)} className="w-full">
              <Plus className="size-4 mr-2" /> Novo admin
            </Button>
          ) : (
            <form onSubmit={submitNovo} className="space-y-3 rounded-lg border p-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome</Label>
                <Input value={newNome} onChange={(e) => setNewNome(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Senha (mín. 8)</Label>
                <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={busyCreate}>
                  {busyCreate ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
                  Criar admin
                </Button>
                <Button type="button" variant="ghost" onClick={() => setNewOpen(false)}>Cancelar</Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExcluirSetorButton({ senha, slug, nome, onDeleted }: { senha: string; slug: string; nome: string; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const excluir = useServerFn(excluirSetorReceptor);

  const submit = async () => {
    if (confirm !== slug) return toast.error(`Digite "${slug}" para confirmar.`);
    setBusy(true);
    try {
      await excluir({ data: { senha, slug, confirmacao: confirm } });
      toast.success(`Setor "${nome}" excluído.`);
      setOpen(false); setConfirm("");
      onDeleted();
    } catch (err: any) {
      toast.error(err.message ?? "Falha ao excluir.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setConfirm(""); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir setor "{nome}"?</DialogTitle>
          <DialogDescription>
            Esta ação é <strong>permanente</strong> e remove:
            <ul className="list-disc ml-5 mt-2 space-y-0.5">
              <li>Todos os chamados e soluções deste setor</li>
              <li>Todos os usuários (admins e demais) deste setor</li>
              <li>Configurações de SLA e setores solicitantes</li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs">Para confirmar, digite o identificador <code className="font-mono">{slug}</code>:</Label>
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={slug} autoFocus />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="destructive" disabled={busy || confirm !== slug} onClick={submit}>
            {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Trash2 className="size-4 mr-2" />}
            Excluir permanentemente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
