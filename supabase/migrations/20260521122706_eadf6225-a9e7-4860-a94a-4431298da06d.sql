
-- Enums
CREATE TYPE public.setor_tipo AS ENUM ('patrimonio', 'refrigeracao');
CREATE TYPE public.user_role AS ENUM ('admin', 'secundario', 'usuario');
CREATE TYPE public.chamado_status AS ENUM ('aberto', 'em_andamento', 'finalizado', 'atrasado');

-- Perfis
CREATE TABLE public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  setor public.setor_tipo NOT NULL,
  role public.user_role NOT NULL DEFAULT 'usuario',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- Security definer helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_setor(_user_id UUID)
RETURNS public.setor_tipo
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT setor FROM public.perfis WHERE id = _user_id $$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.user_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.perfis WHERE id = _user_id $$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.perfis WHERE id = _user_id AND role IN ('admin','secundario')) $$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.perfis WHERE id = _user_id AND role = 'admin') $$;

-- Perfis RLS
CREATE POLICY "users view own profile" ON public.perfis FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "staff view sector profiles" ON public.perfis FOR SELECT
  USING (public.is_staff(auth.uid()) AND setor = public.get_user_setor(auth.uid()));
CREATE POLICY "users insert own profile on signup" ON public.perfis FOR INSERT
  WITH CHECK (auth.uid() = id);
CREATE POLICY "admins insert sector profiles" ON public.perfis FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) AND setor = public.get_user_setor(auth.uid()));
CREATE POLICY "users update own profile" ON public.perfis FOR UPDATE
  USING (auth.uid() = id);
CREATE POLICY "admins update sector profiles" ON public.perfis FOR UPDATE
  USING (public.is_admin(auth.uid()) AND setor = public.get_user_setor(auth.uid()));

-- Chamados
CREATE TABLE public.chamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_destino public.setor_tipo NOT NULL,
  solicitante_nome TEXT NOT NULL,
  solicitante_setor TEXT NOT NULL,
  solicitante_ramal TEXT NOT NULL,
  descricao TEXT NOT NULL,
  status public.chamado_status NOT NULL DEFAULT 'aberto',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sla_vencimento TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chamados_setor ON public.chamados(setor_destino);
CREATE INDEX idx_chamados_user ON public.chamados(user_id);
CREATE INDEX idx_chamados_status ON public.chamados(status);
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own chamados" ON public.chamados FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "staff view sector chamados" ON public.chamados FOR SELECT
  USING (public.is_staff(auth.uid()) AND setor_destino = public.get_user_setor(auth.uid()));
CREATE POLICY "users insert own chamados" ON public.chamados FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff update sector chamados" ON public.chamados FOR UPDATE
  USING (public.is_staff(auth.uid()) AND setor_destino = public.get_user_setor(auth.uid()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_chamados_updated_at BEFORE UPDATE ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Soluções
CREATE TABLE public.solucoes_chamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  descricao_solucao TEXT NOT NULL,
  tempo_gasto_minutos INTEGER NOT NULL DEFAULT 0,
  data_resolucao TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_solucoes_chamado ON public.solucoes_chamados(chamado_id);
ALTER TABLE public.solucoes_chamados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view solucoes of accessible chamados" ON public.solucoes_chamados FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.chamados c WHERE c.id = chamado_id));
CREATE POLICY "staff insert solucoes for sector chamados" ON public.solucoes_chamados FOR INSERT
  WITH CHECK (
    public.is_staff(auth.uid())
    AND EXISTS (SELECT 1 FROM public.chamados c WHERE c.id = chamado_id AND c.setor_destino = public.get_user_setor(auth.uid()))
  );

-- SLA config por setor
CREATE TABLE public.sla_config (
  setor public.setor_tipo PRIMARY KEY,
  horas_resposta INTEGER NOT NULL DEFAULT 4,
  horas_resolucao INTEGER NOT NULL DEFAULT 24,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.sla_config (setor) VALUES ('patrimonio'), ('refrigeracao');
ALTER TABLE public.sla_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff view sector sla" ON public.sla_config FOR SELECT
  USING (public.is_staff(auth.uid()) AND setor = public.get_user_setor(auth.uid()));
CREATE POLICY "admin update sector sla" ON public.sla_config FOR UPDATE
  USING (public.is_admin(auth.uid()) AND setor = public.get_user_setor(auth.uid()));

-- Trigger: set sla_vencimento automatically on insert
CREATE OR REPLACE FUNCTION public.set_chamado_sla()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h INTEGER;
BEGIN
  IF NEW.sla_vencimento IS NULL THEN
    SELECT horas_resolucao INTO h FROM public.sla_config WHERE setor = NEW.setor_destino;
    NEW.sla_vencimento := NEW.created_at + (COALESCE(h,24) || ' hours')::interval;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_chamados_set_sla BEFORE INSERT ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.set_chamado_sla();

-- Realtime
ALTER TABLE public.chamados REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chamados;
ALTER TABLE public.solucoes_chamados REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.solucoes_chamados;
