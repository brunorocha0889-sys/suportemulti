import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useSetorReceptor, useSetoresReceptores, corStyleSetor, nomeSetor } from "@/lib/setores-receptores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/$setor")({
  component: AuthPage,
});

function AuthPage() {
  const { setor } = Route.useParams();
  const navigate = useNavigate();
  const { session, perfil, loading } = useAuth();
  const { data: receptor, isLoading: loadingSetor } = useSetorReceptor(setor);
  const { data: todos } = useSetoresReceptores({ incluirInativos: true });

  // Setor inválido / inativo -> volta pra home
  useEffect(() => {
    if (!loadingSetor && receptor === null) {
      navigate({ to: "/" });
    }
  }, [loadingSetor, receptor, navigate]);

  useEffect(() => {
    if (!loading && session && perfil) {
      if (perfil.setor !== setor) {
        const seuSetor = todos?.find((s) => s.slug === perfil.setor);
        toast.error(`Sua conta pertence ao setor ${nomeSetor(perfil.setor, seuSetor)}.`);
        supabase.auth.signOut();
        return;
      }
      navigate({ to: "/app/$setor", params: { setor } });
    }
  }, [loading, session, perfil, setor, navigate, todos]);

  const inicial = (receptor?.nome ?? setor).charAt(0).toUpperCase();

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10 bg-gradient-to-br from-background to-accent/40">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="size-4" /> Trocar de setor
        </Link>
        <Card className="border-2">
          <CardHeader className="space-y-3">
            <div
              className="size-12 rounded-lg grid place-items-center text-lg font-bold"
              style={corStyleSetor(receptor)}
            >
              {inicial}
            </div>
            <div>
              <CardTitle className="text-2xl">HelpDesk — {nomeSetor(setor, receptor)}</CardTitle>
              <CardDescription>Acesse ou crie sua conta para este setor.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>
              <TabsContent value="signin"><SignIn setor={setor} setorNome={nomeSetor(setor, receptor)} /></TabsContent>
              <TabsContent value="signup"><SignUp setor={setor} setorNome={nomeSetor(setor, receptor)} /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SignIn({ setor, setorNome }: { setor: string; setorNome: string }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const email = identifier.trim().toLowerCase() === "admin"
      ? `admin@${setor}.local`
      : identifier.trim();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handle} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>E-mail ou usuário</Label>
        <Input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder='Use "Admin" para o administrador padrão'
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Senha</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
        Entrar em {setorNome}
      </Button>
    </form>
  );
}

function SignUp({ setor, setorNome }: { setor: string; setorNome: string }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("A senha precisa ter ao menos 6 caracteres.");
    setBusy(true);
    const redirectUrl = `${window.location.origin}/app/${setor}`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName, setor },
      },
    });
    if (error) {
      toast.error(error.message);
      setBusy(false);
      return;
    }
    if (data.user) {
      const { error: pErr } = await supabase.from("perfis").insert({
        id: data.user.id,
        full_name: fullName,
        email,
        setor,
        role: "usuario",
      });
      if (pErr) {
        toast.error("Erro ao criar perfil: " + pErr.message);
        setBusy(false);
        return;
      }
      toast.success("Conta criada! Você já pode usar o sistema.");
    }
    setBusy(false);
  };

  return (
    <form onSubmit={handle} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Nome completo</Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>E-mail</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Senha</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
        Criar conta em {setorNome}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Você será cadastrado como usuário solicitante. Administradores podem promover outros usuários.
      </p>
    </form>
  );
}
