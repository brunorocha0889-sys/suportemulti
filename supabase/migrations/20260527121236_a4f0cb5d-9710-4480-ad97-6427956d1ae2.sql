ALTER TYPE chamado_status ADD VALUE IF NOT EXISTS 'em_espera';
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS pausado_em TIMESTAMPTZ;
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS motivo_pausa TEXT;
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS tempo_pausado_minutos INTEGER NOT NULL DEFAULT 0;