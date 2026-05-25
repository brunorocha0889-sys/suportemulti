DROP POLICY IF EXISTS "anyone can insert chamados" ON public.chamados;

CREATE POLICY "public can create chamados"
ON public.chamados
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "public can view unowned chamados after creation" ON public.chamados;

CREATE POLICY "public can view unowned chamados after creation"
ON public.chamados
FOR SELECT
TO anon, authenticated
USING (user_id IS NULL);