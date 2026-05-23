
-- 1) numero_os field + per-year sequence
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS numero_os TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS public.os_counter (
  ano INTEGER PRIMARY KEY,
  ultimo INTEGER NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.set_chamado_numero_os()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ano INTEGER;
  v_seq INTEGER;
BEGIN
  IF NEW.numero_os IS NULL THEN
    v_ano := EXTRACT(YEAR FROM COALESCE(NEW.created_at, now()))::INTEGER;
    INSERT INTO public.os_counter (ano, ultimo) VALUES (v_ano, 1)
      ON CONFLICT (ano) DO UPDATE SET ultimo = public.os_counter.ultimo + 1
      RETURNING ultimo INTO v_seq;
    NEW.numero_os := 'OS-' || v_ano || '-' || LPAD(v_seq::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chamados_numero_os ON public.chamados;
CREATE TRIGGER trg_chamados_numero_os
  BEFORE INSERT ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.set_chamado_numero_os();

-- Backfill existing rows
DO $$
DECLARE r RECORD; v_seq INTEGER; v_ano INTEGER;
BEGIN
  FOR r IN SELECT id, created_at FROM public.chamados WHERE numero_os IS NULL ORDER BY created_at LOOP
    v_ano := EXTRACT(YEAR FROM r.created_at)::INTEGER;
    INSERT INTO public.os_counter (ano, ultimo) VALUES (v_ano, 1)
      ON CONFLICT (ano) DO UPDATE SET ultimo = public.os_counter.ultimo + 1
      RETURNING ultimo INTO v_seq;
    UPDATE public.chamados SET numero_os = 'OS-' || v_ano || '-' || LPAD(v_seq::TEXT, 5, '0') WHERE id = r.id;
  END LOOP;
END $$;

-- 2) ramal nullable
ALTER TABLE public.chamados ALTER COLUMN solicitante_ramal DROP NOT NULL;

-- 3) setores_solicitantes table
CREATE TABLE IF NOT EXISTS public.setores_solicitantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_destino setor_tipo NOT NULL,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (setor_destino, nome)
);

ALTER TABLE public.setores_solicitantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can view active setores"
  ON public.setores_solicitantes FOR SELECT
  TO anon, authenticated
  USING (ativo = true OR (is_admin(auth.uid()) AND setor_destino = get_user_setor(auth.uid())));

CREATE POLICY "admin insert sector setores"
  ON public.setores_solicitantes FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()) AND setor_destino = get_user_setor(auth.uid()));

CREATE POLICY "admin update sector setores"
  ON public.setores_solicitantes FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()) AND setor_destino = get_user_setor(auth.uid()));

CREATE POLICY "admin delete sector setores"
  ON public.setores_solicitantes FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()) AND setor_destino = get_user_setor(auth.uid()));

CREATE TRIGGER trg_setores_solicitantes_updated
  BEFORE UPDATE ON public.setores_solicitantes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Public lookup function
CREATE OR REPLACE FUNCTION public.buscar_chamado_por_os(p_numero TEXT)
RETURNS TABLE (
  numero_os TEXT,
  setor_destino setor_tipo,
  solicitante_nome TEXT,
  solicitante_setor TEXT,
  status chamado_status,
  descricao TEXT,
  created_at TIMESTAMPTZ,
  sla_vencimento TIMESTAMPTZ,
  solucao TEXT,
  tempo_gasto_minutos INTEGER,
  data_resolucao TIMESTAMPTZ
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.numero_os, c.setor_destino, c.solicitante_nome, c.solicitante_setor,
    c.status, c.descricao, c.created_at, c.sla_vencimento,
    s.descricao_solucao, s.tempo_gasto_minutos, s.data_resolucao
  FROM public.chamados c
  LEFT JOIN LATERAL (
    SELECT descricao_solucao, tempo_gasto_minutos, data_resolucao
    FROM public.solucoes_chamados WHERE chamado_id = c.id
    ORDER BY data_resolucao DESC LIMIT 1
  ) s ON true
  WHERE UPPER(c.numero_os) = UPPER(TRIM(p_numero))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.buscar_chamado_por_os(TEXT) TO anon, authenticated;
