
ALTER TABLE public.os_counter ENABLE ROW LEVEL SECURITY;
-- No policies = no direct access; trigger uses SECURITY DEFINER and bypasses RLS.
