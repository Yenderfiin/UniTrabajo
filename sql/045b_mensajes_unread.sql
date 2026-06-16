-- Historia de Usuario Ep9-Hu7: Notificacion de nuevos mensajes
-- Agrega marca de lectura por participante para calcular mensajes no leidos.
-- Ejecutar en Supabase SQL Editor.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_read_a timestamptz,
  ADD COLUMN IF NOT EXISTS last_read_b timestamptz;
