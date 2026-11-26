-- ============================================================
-- Script 047: bloquear la lectura anónima de datos personales
-- Ejecutar en Supabase SQL Editor (requiere rol postgres).
-- ============================================================
-- Hallazgo (prueba PS-01, 29 oct. 2026): con la clave pública
-- (anon) del frontend, una petición GET a /rest/v1/users devolvía
-- las 1004 filas de usuarios con documento, correo y teléfono.
-- Lo mismo pasaba con offers, aplications, notifications, ratings
-- y conversations. Esa clave viaja en el JavaScript del sitio, así
-- que cualquiera podía descargar la base completa sin iniciar sesión.
--
-- La aplicación solo consulta estas tablas con sesión iniciada
-- (rol authenticated). El rol anon solo necesita:
--   * leer universities (formulario de registro)
--   * insertar en users (registro, por si la confirmación de correo
--     está activa y el signUp no devuelve sesión)
--
-- REVOKE actúa sobre los privilegios de tabla, que se evalúan antes
-- que las políticas RLS. Por eso no hace falta conocer ni tocar las
-- políticas existentes y el rol authenticated sigue igual.
-- ============================================================

begin;

revoke select, update, delete on table public.users from anon;

revoke select, insert, update, delete on table
  public.offers,
  public.job_details,
  public.aplications,
  public.notifications,
  public.ratings,
  public.conversations,
  public.messages
from anon;

-- universities sigue disponible para el registro
grant select on table public.universities to anon;

-- El registro verifica si el documento ya existe antes de crear la cuenta en
-- Auth. Sin SELECT sobre users, esa verificación se hace con esta función,
-- que responde solo verdadero o falso y no expone ningún dato.
create or replace function public.documento_registrado(doc text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.users where document = doc);
$$;

revoke all on function public.documento_registrado(text) from public;
grant execute on function public.documento_registrado(text) to anon, authenticated;

commit;

-- ------------------------------------------------------------
-- Verificación (desde una terminal, con la clave anon):
--   curl "https://<proyecto>.supabase.co/rest/v1/users?select=document&limit=1" \
--        -H "apikey: <anon>" -H "Authorization: Bearer <anon>"
-- Antes: 200 con datos. Después: 401 con código 42501
-- ("permission denied for table users").
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- Pendiente (segunda capa, revisar antes de activar):
-- cualquier usuario autenticado todavía puede leer notificaciones
-- ajenas. Para limitarlo hay que reemplazar las políticas actuales
-- de notifications. Consulte primero las existentes con:
--   select policyname, cmd, roles, qual from pg_policies
--   where schemaname = 'public' and tablename = 'notifications';
-- y luego, si no hay otras políticas permisivas:
--
-- create or replace function public.current_document()
-- returns varchar language sql stable security definer
-- set search_path = public as $$
--   select document from public.users
--   where lower(email) = lower(auth.email()) limit 1
-- $$;
--
-- alter table public.notifications enable row level security;
-- create policy "notifications_select_owner" on public.notifications
--   for select to authenticated using (user_document = public.current_document());
-- create policy "notifications_update_owner" on public.notifications
--   for update to authenticated using (user_document = public.current_document());
-- create policy "notifications_insert_auth" on public.notifications
--   for insert to authenticated with check (true);
-- ------------------------------------------------------------
