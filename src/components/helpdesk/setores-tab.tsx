import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Setor } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pencil, Check, X } from "lucide-react";

interface SetorRow { id: string; nome: string; ativo: boolean; setor_destino: Setor }

export function SetoresTab({ setor }: { setor: Setor }) {
  const qc = useQueryClient();
  const [novo, setNovo] = useState("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");

  const { data: setores, isLoading } = useQuery({
    queryKey: ["setores-admin", setor],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("setores_solicitantes")
        .select("*")
        .eq("setor_destino", setor)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as SetorRow[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["setores-admin", setor] });
    qc.invalidateQueries({ queryKey: ["setores-solicitantes", setor] });
  };

  const adicionar = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = novo.trim();
    if (!nome) return;
    setBusy(true);
    const { error } = await (supabase as any)
      .from("setores_solicitantes")
      .insert({ nome, setor_destino: setor });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Setor cadastrado.");
    setNovo("");
    invalidate();
  };

  const toggle = async (s: SetorRow) => {
    const { error } = await (supabase as any)
      .from("setores_solicitantes")
      .update({ ativo: !s.ativo })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(s.ativo ? "Setor desativado." : "Setor ativado.");
    invalidate();
  };

  const salvarEdit = async (id: string) => {
    const nome = editNome.trim();
    if (!nome) return;
    const { error } = await (supabase as any)
      .from("setores_solicitantes")
      .update({ nome })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Setor atualizado.");
    setEditId(null);
    invalidate();
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir este setor?")) return;
    const { error } = await (supabase as any)
      .from("setores_solicitantes")
      .delete()
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Setor removido.");
    invalidate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Setores solicitantes</CardTitle>
        <CardDescription>
          Cadastre os setores da empresa que podem abrir chamados (TI, RH, Almoxarifado…).
          Setores desativados não aparecem no formulário público.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={adicionar} className="flex gap-2 items-end">
          <div className="flex-1 space-y-1.5">
            <Label>Novo setor</Label>
            <Input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Ex: TI, RH, Almoxarifado..." />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
            Cadastrar
          </Button>
        </form>

        {isLoading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : !setores?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum setor cadastrado ainda.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {setores.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3">
                {editId === s.id ? (
                  <>
                    <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} className="flex-1" autoFocus />
                    <Button size="sm" variant="default" onClick={() => salvarEdit(s.id)}>
                      <Check className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                      <X className="size-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className={`flex-1 font-medium ${!s.ativo ? "text-muted-foreground line-through" : ""}`}>
                      {s.nome}
                    </span>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Ativo</Label>
                      <Switch checked={s.ativo} onCheckedChange={() => toggle(s)} />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => { setEditId(s.id); setEditNome(s.nome); }}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => excluir(s.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
