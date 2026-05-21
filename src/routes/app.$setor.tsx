import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth, setorLabel, type Setor } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LogOut, Package, Snowflake, Plus, ListChecks, BarChart3, Users, Settings, Loader2 } from "lucide-react";
import { useChamados, ChamadosList, StatsCards, type ChamadoRow } from "@/components/helpdesk/chamado-shared";
import { NovoChamadoForm } from "@/components/helpdesk/novo-chamado";
import { ChamadoDialog } from "@/components/helpdesk/chamado-dialog";
import { UsuariosTab, SlaConfigTab } from "@/components/helpdesk/admin-tabs";
import { RelatoriosTab } from "@/components/helpdesk/relatorios";
import { isSlaVencido, type ChamadoStatus } from "@/lib/chamado-utils";

const VALID: Setor[] = ["patrimonio", "refrigeracao"];

export const Route = createFileRoute("/app/$setor")({
  beforeLoad: ({ params }) => {
    if (!VALID.includes(params.setor as Setor)) throw redirect({ to: "/" });
  },
  component: AppPage,
});

function AppPage() {
  const { setor } = Route.useParams() as { setor: Setor };
  const { session, perfil, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth/$setor", params: { setor } });
  }, [loading, session, setor, navigate]);

  useEffect(() => {
    if (perfil && perfil.setor !== setor) {
      navigate({ to: "/" });
    }
  }, [perfil, setor, navigate]);

  if (loading || !session || !perfil) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!perfil.ativo) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold">Conta desativada</h2>
          <p className="text-sm text-muted-foreground mt-2">Entre em contato com o administrador do setor.</p>
          <Button className="mt-4" onClick={() => signOut()}>Sair</Button>
        </div>
      </div>
    );
  }

  const isStaff = perfil.role === "admin" || perfil.role === "secundario";
  const isAdmin = perfil.role === "admin";
  const accent = setor === "patrimonio" ? "bg-patrimonio text-patrimonio-foreground" : "bg-refrigeracao text-refrigeracao-foreground";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/" className={`size-10 rounded-lg ${accent} grid place-items-center`}>
              {setor === "patrimonio" ? <Package className="size-5" /> : <Snowflake className="size-5" />}
            </Link>
            <div>
              <p className="text-xs text-muted-foreground leading-none">HelpDesk</p>
              <h1 className="font-semibold leading-tight">{setorLabel(setor)}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">{perfil.full_name}</p>
              <Badge variant="secondary" className="mt-1 text-[10px]">{perfil.role}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="size-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {isStaff ? (
          <StaffView setor={setor} isAdmin={isAdmin} />
        ) : (
          <UserView setor={setor} />
        )}
      </main>
    </div>
  );
}

function UserView({ setor }: { setor: Setor }) {
  const { data, isLoading } = useChamados(setor, "mine");
  const [selected, setSelected] = useState<ChamadoRow | null>(null);
  return (
    <Tabs defaultValue="meus" className="space-y-5">
      <TabsList>
        <TabsTrigger value="meus"><ListChecks className="size-4 mr-2" /> Meus chamados</TabsTrigger>
        <TabsTrigger value="novo"><Plus className="size-4 mr-2" /> Novo</TabsTrigger>
      </TabsList>
      <TabsContent value="meus" className="space-y-5">
        <StatsCards chamados={data} />
        <ChamadosList chamados={data} loading={isLoading} emptyText="Você ainda não abriu chamados." onSelect={setSelected} />
      </TabsContent>
      <TabsContent value="novo">
        <NovoChamadoForm setor={setor} />
      </TabsContent>
      <ChamadoDialog chamado={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} canManage={false} />
    </Tabs>
  );
}

function StaffView({ setor, isAdmin }: { setor: Setor; isAdmin: boolean }) {
  const { data, isLoading } = useChamados(setor, "sector");
  const [selected, setSelected] = useState<ChamadoRow | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("todos");

  const filtered = useMemo(() => {
    return (data ?? []).filter((c) => {
      if (search && !c.solicitante_nome.toLowerCase().includes(search.toLowerCase()) && !c.descricao.toLowerCase().includes(search.toLowerCase())) return false;
      if (status === "todos") return true;
      if (status === "atrasado") return isSlaVencido(c.sla_vencimento, c.status) && c.status !== "finalizado";
      return c.status === (status as ChamadoStatus);
    });
  }, [data, search, status]);

  return (
    <Tabs defaultValue="gerenciar" className="space-y-5">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="gerenciar"><ListChecks className="size-4 mr-2" /> Gerenciar</TabsTrigger>
        <TabsTrigger value="novo"><Plus className="size-4 mr-2" /> Novo</TabsTrigger>
        {isAdmin && <TabsTrigger value="relatorios"><BarChart3 className="size-4 mr-2" /> Relatórios</TabsTrigger>}
        {isAdmin && <TabsTrigger value="usuarios"><Users className="size-4 mr-2" /> Usuários</TabsTrigger>}
        {isAdmin && <TabsTrigger value="config"><Settings className="size-4 mr-2" /> SLA</TabsTrigger>}
      </TabsList>

      <TabsContent value="gerenciar" className="space-y-5">
        <StatsCards chamados={data} />
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Buscar por nome ou descrição..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="aberto">Abertos</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="finalizado">Finalizados</SelectItem>
              <SelectItem value="atrasado">SLA vencido</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ChamadosList chamados={filtered} loading={isLoading} emptyText="Nenhum chamado encontrado." onSelect={setSelected} />
      </TabsContent>

      <TabsContent value="novo"><NovoChamadoForm setor={setor} /></TabsContent>
      {isAdmin && <TabsContent value="relatorios"><RelatoriosTab setor={setor} /></TabsContent>}
      {isAdmin && <TabsContent value="usuarios"><UsuariosTab setor={setor} /></TabsContent>}
      {isAdmin && <TabsContent value="config"><SlaConfigTab setor={setor} /></TabsContent>}

      <ChamadoDialog chamado={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} canManage />
    </Tabs>
  );
}
