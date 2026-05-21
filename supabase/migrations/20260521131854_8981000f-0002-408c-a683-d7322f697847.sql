
ALTER TABLE public.chamados ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "users insert own chamados" ON public.chamados;

CREATE POLICY "anyone can insert chamados"
ON public.chamados
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR (auth.uid() = user_id)
);
