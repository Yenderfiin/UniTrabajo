-- Historia de Usuario 058: Calificar trabajador
-- Ejecutar en Supabase SQL Editor.
-- Nota: La tabla ratings ya existe en la BD con estructura:
--   - id_offer (varchar)
--   - document_rater (varchar)
--   - document_rated (varchar)
--   - score (integer 1-5)
--   - comment (text)
--   - PK: (id_offer, document_rater, document_rated)

-- Habilitar Row Level Security
alter table public.ratings enable row level security;

-- Política: Lectura de calificaciones - cualquiera puede ver las calificaciones de un usuario
drop policy if exists "ratings_select_all" on public.ratings;
create policy "ratings_select_all"
on public.ratings
for select
using (true);

-- Política: Inserción de calificaciones - solo el usuario autenticado puede calificar
-- El usuario debe estar asociado al documento_rater
drop policy if exists "ratings_insert_authenticated" on public.ratings;
create policy "ratings_insert_authenticated"
on public.ratings
for insert
with check (
  exists (
    select 1
    from public.users u
    where u.document = ratings.document_rater
      and u.email = auth.email()
  )
  and ratings.score >= 1
  and ratings.score <= 5
);

-- Política: Eliminación - solo el usuario que calificó puede eliminar
-- (permite corrección si se equivoca al calificar)
drop policy if exists "ratings_delete_rater" on public.ratings;
create policy "ratings_delete_rater"
on public.ratings
for delete
using (
  exists (
    select 1
    from public.users u
    where u.document = ratings.document_rater
      and u.email = auth.email()
  )
);
