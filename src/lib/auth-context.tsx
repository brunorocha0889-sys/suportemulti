import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Setor agora é qualquer string (slug definido em setores_receptores)
export type Setor = string;
export type Role = "admin" | "secundario" | "usuario";

export interface Perfil {
  id: string;
  full_name: string;
  email: string;
  setor: Setor;
  role: Role;
  ativo: boolean;
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  perfil: Perfil | null;
  loading: boolean;
  refreshPerfil: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPerfil = async (uid: string) => {
    const { data } = await supabase.from("perfis").select("*").eq("id", uid).maybeSingle();
    setPerfil((data as Perfil) ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadPerfil(s.user.id), 0);
      } else {
        setPerfil(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadPerfil(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        perfil,
        loading,
        refreshPerfil: async () => {
          if (session?.user) await loadPerfil(session.user.id);
        },
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}

/** Fallback humanizado quando ainda não temos o nome real do setor. */
export const setorLabel = (s: Setor) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ") : "";
