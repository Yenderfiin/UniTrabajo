-- Historia de Usuario 044: Envio de mensajes
-- Ejecutar en Supabase SQL Editor.

create table if not exists public.messages (
  id bigserial primary key,
  conversation_id text not null references public.conversations(id) on delete cascade,
  sender_document varchar(20) not null references public.users(document),
  body text not null,
  created_at timestamptz not null default now(),
  constraint messages_body_not_empty check (char_length(btrim(body)) > 0)
);

create index if not exists idx_messages_conversation_created
  on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

-- Lectura de mensajes: solo participantes de la conversacion.
drop policy if exists "messages_select_participants" on public.messages;
create policy "messages_select_participants"
on public.messages
for select
using (
  exists (
    select 1
    from public.conversations c
    join public.users u on u.document in (c.participant_a, c.participant_b)
    where c.id = messages.conversation_id
      and u.email = auth.email()
  )
);

-- Insercion de mensajes: solo participantes y solo como remitente propio.
drop policy if exists "messages_insert_participants" on public.messages;
create policy "messages_insert_participants"
on public.messages
for insert
with check (
  exists (
    select 1
    from public.conversations c
    join public.users u on u.document in (c.participant_a, c.participant_b)
    where c.id = messages.conversation_id
      and u.email = auth.email()
  )
  and exists (
    select 1
    from public.users me
    where me.document = messages.sender_document
      and me.email = auth.email()
  )
  and char_length(btrim(messages.body)) > 0
);
