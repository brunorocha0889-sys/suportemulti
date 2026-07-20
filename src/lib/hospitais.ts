import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Hospital {
  id: string;
  slug: string;
  nome: string;
  ativo: boolean;
}

const STORAGE_KEY = "helpdesk.hospital_id";

export function useHospitais(opts?: { incluirInativos?: boolean }) {
  return useQuery({
    queryKey: ["hospitais", opts?.incluirInativos ? "all" : "ativos"],
    queryFn: async () => {
      let q = (supabase as any).from("hospitais").select("*").order("nome");
      if (!opts?.incluirInativos) q = q.eq("ativo", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Hospital[];
    },
    staleTime: 30_000,
  });
}

/** Hospital selecionado (persistido em localStorage). */
export function useHospitalSelecionado() {
  const { data: hospitais } = useHospitais();
  const [hospitalId, setHospitalIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  // Se o hospital salvo não existe mais / inativo, cai para o primeiro.
  useEffect(() => {
    if (!hospitais || hospitais.length === 0) return;
    const valid = hospitalId && hospitais.some((h) => h.id === hospitalId);
    if (!valid) {
      const next = hospitais[0].id;
      setHospitalIdState(next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    }
  }, [hospitais, hospitalId]);

  const setHospitalId = useCallback((id: string) => {
    setHospitalIdState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  }, []);

  const hospital = hospitais?.find((h) => h.id === hospitalId) ?? null;
  return { hospitais: hospitais ?? [], hospital, hospitalId, setHospitalId };
}
