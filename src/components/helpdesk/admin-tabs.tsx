import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Setor } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Perfil {
  id: string; full_name: string; email: string; setor: Setor;
  role: "admin" | "secundario" | "usuario"; ativo: boolean;
}

export function UsuariosTab({ setor }: { setor: Setor }) {
  const qc = useQueryClient();
  const { data: users, isLoading } = useQuery({
    queryKey: ["perfis", setor],
    queryFn: async () => {
      const { data, error } = await supabase.from("perfis").select("*").eq("setor", setor).order("full_name");
      if (error) throw error;
      return (data ?? []) as Perfil[];
    },
  });

  const updateUser = async (id: string, patch: Partial<Perfil>) => {
    const { error } = await supabase.from("perfis").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Usuário atualizado.");
    qc.invalidateQueries({ queryKey: ["perfis", setor] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuários do setor</CardTitle>
        <CardDescription>
          Promova usuários a secundário, desative contas. Novos usuários se cadastram pela tela de login.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <div className="divide-y">
            {users?.map((u) => (
              <div key={u.id} className="py-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-medium">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                <Select value={u.role} onValueChange={(v) => updateUser(u.id, { role: v as Perfil["role"] })}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usuario">Usuário</SelectItem>
                    <SelectItem value="secundario">Secundário</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Ativo</Label>
                  <Switch checked={u.ativo} onCheckedChange={(v) => updateUser(u.id, { ativo: v })} />
                </div>
              </div>
            ))}
            {!users?.length && <p className="text-sm text-muted-foreground">Nenhum usuário.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SlaConfigTab({ setor }: { setor: Setor }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["sla", setor],
    queryFn: async () => {
      const { data, error } = await supabase.from("sla_config").select("*").eq("setor", setor).maybeSingle();
      if (error) throw error;
      return data as { setor: Setor; horas_resposta: number; horas_resolucao: number } | null;
    },
  });

  const [resp, setResp] = useState<number | null>(null);
  const [resol, setResol] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const hr = resp ?? data?.horas_resposta ?? 4;
  const hrr = resol ?? data?.horas_resolucao ?? 24;

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("sla_config")
      .update({ horas_resposta: hr, horas_resolucao: hrr, updated_at: new Date().toISOString() })
      .eq("setor", setor);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("SLA atualizado.");
    qc.invalidateQueries({ queryKey: ["sla", setor] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração de SLA</CardTitle>
        <CardDescription>Define o tempo limite para resposta e resolução dos chamados deste setor.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
        {isLoading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <>
            <div className="space-y-2">
              <Label>Tempo de resposta (horas)</Label>
              <Input type="number" min={1} value={hr} onChange={(e) => setResp(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Tempo de resolução (horas)</Label>
              <Input type="number" min={1} value={hrr} onChange={(e) => setResol(Number(e.target.value))} />
            </div>
            <Button onClick={save} disabled={busy}>
              {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
