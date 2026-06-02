
CREATE TABLE public.setores_receptores (
  slug text PRIMARY KEY,
  nome text NOT NULL,
  cor_hex text NOT NULL DEFAULT '#3b82f6',
  cor_fg_hex text NOT NULL DEFAULT '#ffffff',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.setores_receptores TO anon, authenticated;
GRANT ALL ON public.setores_receptores TO service_role;

ALTER TABLE public.setores_receptores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone view active receptores"
  ON public.setores_receptores FOR SELECT
  TO anon, authenticated
  USING (ativo = true OR is_staff(auth.uid()));

INSERT INTO public.setores_receptores (slug, nome, cor_hex, cor_fg_hex) VALUES
  ('patrimonio',   'Patrimônio',   '#2d4dc1', '#ffffff'),
  ('refrigeracao', 'Climatização', '#3aa8c1', '#ffffff');

-- Drop all policies that reference get_user_setor or setor_tipo
DROP POLICY IF EXISTS "staff update sector chamados" ON public.chamados;
DROP POLICY IF EXISTS "staff view sector chamados" ON public.chamados;
DROP POLICY IF EXISTS "admins insert sector profiles" ON public.perfis;
DROP POLICY IF EXISTS "admins update sector profiles" ON public.perfis;
DROP POLICY IF EXISTS "staff view sector profiles" ON public.perfis;
DROP POLICY IF EXISTS "users update own profile" ON public.perfis;
DROP POLICY IF EXISTS "admin delete sector setores" ON public.setores_solicitantes;
DROP POLICY IF EXISTS "admin insert sector setores" ON public.setores_solicitantes;
DROP POLICY IF EXISTS "admin update sector setores" ON public.setores_solicitantes;
DROP POLICY IF EXISTS "anyone can view active setores" ON public.setores_solicitantes;
DROP POLICY IF EXISTS "admin update sector sla" ON public.sla_config;
DROP POLICY IF EXISTS "staff view sector sla" ON public.sla_config;
DROP POLICY IF EXISTS "staff insert solucoes for sector chamados" ON public.solucoes_chamados;
DROP POLICY IF EXISTS "view solucoes of accessible chamados" ON public.solucoes_chamados;

DROP FUNCTION IF EXISTS public.get_user_setor(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.buscar_chamado_por_os(text);

ALTER TABLE public.chamados              ALTER COLUMN setor_destino TYPE text USING setor_destino::text;
ALTER TABLE public.perfis                ALTER COLUMN setor         TYPE text USING setor::text;
ALTER TABLE public.sla_config            ALTER COLUMN setor         TYPE text USING setor::text;
ALTER TABLE public.setores_solicitantes  ALTER COLUMN setor_destino TYPE text USING setor_destino::text;

ALTER TABLE public.chamados             ADD CONSTRAINT chamados_setor_fk             FOREIGN KEY (setor_destino) REFERENCES public.setores_receptores(slug);
ALTER TABLE public.perfis               ADD CONSTRAINT perfis_setor_fk               FOREIGN KEY (setor)         REFERENCES public.setores_receptores(slug);
ALTER TABLE public.sla_config           ADD CONSTRAINT sla_config_setor_fk           FOREIGN KEY (setor)         REFERENCES public.setores_receptores(slug);
ALTER TABLE public.setores_solicitantes ADD CONSTRAINT setores_solicitantes_setor_fk FOREIGN KEY (setor_destino) REFERENCES public.setores_receptores(slug);

DROP TYPE IF EXISTS public.setor_tipo;

CREATE OR REPLACE FUNCTION public.get_user_setor(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT setor FROM public.perfis WHERE id = _user_id $$;

CREATE OR REPLACE FUNCTION public.buscar_chamado_por_os(p_numero text)
RETURNS TABLE(
  numero_os text, setor_destino text, solicitante_nome text, solicitante_setor text,
  status chamado_status, descricao text, created_at timestamptz, sla_vencimento timestamptz,
  solucao text, tempo_gasto_minutos integer, data_resolucao timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
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

CREATE POLICY "staff view sector chamados"   ON public.chamados FOR SELECT TO public
  USING (is_staff(auth.uid()) AND setor_destino = get_user_setor(auth.uid()));
CREATE POLICY "staff update sector chamados" ON public.chamados FOR UPDATE TO public
  USING (is_staff(auth.uid()) AND setor_destino = get_user_setor(auth.uid()));

CREATE POLICY "staff view sector profiles"   ON public.perfis FOR SELECT TO public
  USING (is_staff(auth.uid()) AND setor = get_user_setor(auth.uid()));
CREATE POLICY "admins insert sector profiles" ON public.perfis FOR INSERT TO public
  WITH CHECK (is_admin(auth.uid()) AND setor = get_user_setor(auth.uid()));
CREATE POLICY "admins update sector profiles" ON public.perfis FOR UPDATE TO public
  USING (is_admin(auth.uid()) AND setor = get_user_setor(auth.uid()));
CREATE POLICY "users update own profile" ON public.perfis FOR UPDATE TO public
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = get_user_role(auth.uid()) AND setor = get_user_setor(auth.uid()));

CREATE POLICY "anyone can view active setores" ON public.setores_solicitantes FOR SELECT TO anon, authenticated
  USING ((ativo = true) OR (is_admin(auth.uid()) AND setor_destino = get_user_setor(auth.uid())));
CREATE POLICY "admin insert sector setores" ON public.setores_solicitantes FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) AND setor_destino = get_user_setor(auth.uid()));
CREATE POLICY "admin update sector setores" ON public.setores_solicitantes FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) AND setor_destino = get_user_setor(auth.uid()));
CREATE POLICY "admin delete sector setores" ON public.setores_solicitantes FOR DELETE TO authenticated
  USING (is_admin(auth.uid()) AND setor_destino = get_user_setor(auth.uid()));

CREATE POLICY "staff view sector sla"   ON public.sla_config FOR SELECT TO public
  USING (is_staff(auth.uid()) AND setor = get_user_setor(auth.uid()));
CREATE POLICY "admin update sector sla" ON public.sla_config FOR UPDATE TO public
  USING (is_admin(auth.uid()) AND setor = get_user_setor(auth.uid()));

CREATE POLICY "staff insert solucoes for sector chamados" ON public.solucoes_chamados FOR INSERT TO public
  WITH CHECK (is_staff(auth.uid()) AND EXISTS (
    SELECT 1 FROM chamados c
    WHERE c.id = solucoes_chamados.chamado_id
      AND c.setor_destino = get_user_setor(auth.uid())
  ));

CREATE POLICY "view solucoes of accessible chamados" ON public.solucoes_chamados FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM chamados c
    WHERE c.id = solucoes_chamados.chamado_id
      AND ((c.user_id = auth.uid()) OR (is_staff(auth.uid()) AND c.setor_destino = get_user_setor(auth.uid())))
  ));
