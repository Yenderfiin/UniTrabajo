-- ============================================================
-- Script 048: integridad de estados y conversaciones
-- Ejecutar en Supabase SQL Editor DESPUÉS de desplegar el frontend
-- corregido (29 oct. 2026), que ya escribe 'Aceptada'/'Rechazada'.
-- ============================================================
-- Hallazgos que corrige:
--   * aplications mezclaba 'Aceptado'/'Aceptada' y 'Rechazado'/'Rechazada'
--     (el código escribía la forma masculina; los datos de prueba, la
--     femenina). La pantalla de postulantes solo reconocía la masculina.
--   * 2 de las 8 conversaciones tenían participant_a = participant_b: el
--     empleador podía abrir un chat consigo mismo desde su propia vacante.
-- Las restricciones se crean NOT VALID: aplican a filas nuevas y no
-- bloquean el script por datos viejos. VALIDATE las comprueba después.
-- ============================================================

begin;

update public.aplications set app_status = 'Aceptada'  where app_status = 'Aceptado';
update public.aplications set app_status = 'Rechazada' where app_status = 'Rechazado';

alter table public.aplications
  add constraint aplications_status_chk
  check (app_status in ('Pendiente', 'Aceptada', 'Rechazada')) not valid;

alter table public.offers
  add constraint offers_status_chk
  check (status in ('Pendiente', 'Activa', 'En curso', 'Cerrada', 'Finalizada')) not valid;

-- Conversaciones de un usuario consigo mismo: se borran (sus mensajes caen
-- por ON DELETE CASCADE) y se impide que vuelvan a crearse.
delete from public.conversations where participant_a = participant_b;

alter table public.conversations
  add constraint conversations_distintos_chk
  check (participant_a <> participant_b) not valid;

commit;

-- Después de revisar que no queden filas inválidas:
-- alter table public.aplications   validate constraint aplications_status_chk;
-- alter table public.offers        validate constraint offers_status_chk;
-- alter table public.conversations validate constraint conversations_distintos_chk;
