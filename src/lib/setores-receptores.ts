import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { setorLabel } from "@/lib/auth-context";

export interface SetorReceptor {
  slug: string;
  nome: string;
  cor_hex: string;
  cor_fg_hex: string;
  ativo: boolean;
}

export function useSetoresReceptores(opts?: { incluirInativos?: boolean }) {
  return useQuery({
    queryKey: ["setores-receptores", opts?.incluirInativos ? "all" : "ativos"],
    queryFn: async () => {
      let q = (supabase as any).from("setores_receptores").select("*").order("nome");
      if (!opts?.incluirInativos) q = q.eq("ativo", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SetorReceptor[];
    },
    staleTime: 30_000,
  });
}

export function useSetorReceptor(slug: string | undefined) {
  return useQuery({
    queryKey: ["setor-receptor", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("setores_receptores")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data as SetorReceptor | null) ?? null;
    },
    staleTime: 60_000,
  });
}

/** Texto exibido enquanto o nome real do setor não carregou. */
export function nomeSetor(slug: string, receptor?: SetorReceptor | null) {
  return receptor?.nome ?? setorLabel(slug);
}

/** Estilo inline para badges/headers a partir das cores do setor. */
export function corStyleSetor(receptor?: SetorReceptor | null): React.CSSProperties {
  return receptor
    ? { backgroundColor: receptor.cor_hex, color: receptor.cor_fg_hex }
    : { backgroundColor: "var(--primary)", color: "var(--primary-foreground)" };
}
