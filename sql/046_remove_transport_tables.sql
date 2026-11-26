-- ============================================================
-- Script: Limpieza de tablas de Transporte Compartido
-- Ejecutar en Supabase SQL Editor
-- ============================================================
-- Este script elimina las tablas y datos relacionados con
-- transporte compartido, dejando solo micro-trabajos.
--
-- Corrección (oct. 2026): la versión anterior borraba de
-- notifications filtrando por id_offer, columna que esa tabla no
-- tiene (sus columnas son id, user_document, type, message,
-- is_read, created_at). El script fallaba en el paso 2 y no
-- borraba nada. Tampoco eliminaba las conversaciones asociadas,
-- y la FK conversations_offer_fk impedía borrar las ofertas.
-- Todo corre dentro de una transacción: si un paso falla, no se
-- aplica ninguno.
-- ============================================================

begin;

-- 1. Eliminar aplicaciones (reservas) vinculadas a ofertas de transporte
DELETE FROM public.aplications
WHERE id_offer IN (
  SELECT id_offer FROM public.offers WHERE type_offer = 'Transporte'
);

-- 2. Eliminar notificaciones propias del módulo de transporte (por tipo)
DELETE FROM public.notifications
WHERE type IN (
  'new_travel_reservation',
  'travel_reservation_accepted',
  'travel_reservation_rejected',
  'travel_finalized',
  'driver_rated',
  'passenger_rated'
);

-- 3. Eliminar calificaciones vinculadas a ofertas de transporte
DELETE FROM public.ratings
WHERE id_offer IN (
  SELECT id_offer FROM public.offers WHERE type_offer = 'Transporte'
);

-- 4. Eliminar conversaciones de ofertas de transporte
--    (los mensajes se borran por ON DELETE CASCADE)
DELETE FROM public.conversations
WHERE id_offer IN (
  SELECT id_offer FROM public.offers WHERE type_offer = 'Transporte'
);

-- 5. Eliminar los detalles de viaje (detail_travels), si la tabla existe
DO $$
BEGIN
  IF to_regclass('public.detail_travels') IS NOT NULL THEN
    DELETE FROM public.detail_travels
    WHERE id_offer IN (
      SELECT id_offer FROM public.offers WHERE type_offer = 'Transporte'
    );
  END IF;
END $$;

-- 6. Eliminar las ofertas de tipo transporte
DELETE FROM public.offers WHERE type_offer = 'Transporte';

-- 7. Eliminar las tablas propias del módulo (ya no se necesitan)
DROP TABLE IF EXISTS public.detail_travels CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;

commit;

-- Verificación: debe devolver 0
-- SELECT count(*) FROM public.offers WHERE type_offer = 'Transporte';
