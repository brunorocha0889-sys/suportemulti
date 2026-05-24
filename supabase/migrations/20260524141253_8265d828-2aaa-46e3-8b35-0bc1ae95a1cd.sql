
-- 1) Prevent privilege escalation on perfis insert/update
DROP POLICY IF EXISTS "users insert own profile on signup" ON public.perfis;
CREATE POLICY "users insert own profile on signup"
ON public.perfis
FOR INSERT
WITH CHECK (auth.uid() = id AND role = 'usuario'::user_role);

DROP POLICY IF EXISTS "users update own profile" ON public.perfis;
CREATE POLICY "users update own profile"
ON public.perfis
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = public.get_user_role(auth.uid())
  AND setor = public.get_user_setor(auth.uid())
);

-- 2) Tighten SELECT on solucoes_chamados to mirror chamado access
DROP POLICY IF EXISTS "view solucoes of accessible chamados" ON public.solucoes_chamados;
CREATE POLICY "view solucoes of accessible chamados"
ON public.solucoes_chamados
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chamados c
    WHERE c.id = solucoes_chamados.chamado_id
      AND (
        c.user_id = auth.uid()
        OR (public.is_staff(auth.uid()) AND c.setor_destino = public.get_user_setor(auth.uid()))
      )
  )
);

-- 3) Pin search_path on remaining helper function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;
