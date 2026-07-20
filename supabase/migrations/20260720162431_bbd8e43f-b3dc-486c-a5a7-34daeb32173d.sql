
-- Tabela de hospitais
CREATE TABLE public.hospitais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.hospitais TO anon;
GRANT SELECT ON public.hospitais TO authenticated;
GRANT ALL ON public.hospitais TO service_role;

ALTER TABLE public.hospitais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospitais ativos visíveis a todos"
  ON public.hospitais FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admins veem todos os hospitais"
  ON public.hospitais FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_hospitais_updated
  BEFORE UPDATE ON public.hospitais
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Hospital padrão para migrar setores existentes
INSERT INTO public.hospitais (slug, nome) VALUES ('principal', 'Hospital Principal');

-- Adiciona hospital_id em setores_receptores
ALTER TABLE public.setores_receptores
  ADD COLUMN hospital_id uuid REFERENCES public.hospitais(id) ON DELETE CASCADE;

UPDATE public.setores_receptores
SET hospital_id = (SELECT id FROM public.hospitais WHERE slug = 'principal')
WHERE hospital_id IS NULL;

ALTER TABLE public.setores_receptores
  ALTER COLUMN hospital_id SET NOT NULL;

CREATE INDEX idx_setores_receptores_hospital ON public.setores_receptores(hospital_id);
