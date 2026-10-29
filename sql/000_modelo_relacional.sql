-- ============================================================
-- UniTrabajo - Modelo relacional (PostgreSQL 15 en Supabase)
-- ------------------------------------------------------------
-- DDL de referencia reconstruido el 29 oct. 2026 a partir de:
--   * las columnas que devuelve la API REST de Supabase para cada tabla,
--   * los nombres de llaves foráneas que usa el frontend
--     (conversations_participant_a_fk, conversations_offer_fk, apn_ofr_fk),
--   * los scripts 044 y 045 de esta carpeta.
-- Las longitudes de varchar son las del script 044 cuando aparecen
-- (document varchar(20)); el resto son las mínimas que admiten los datos
-- actuales. Antes de ejecutar este archivo en un proyecto nuevo, conviene
-- compararlo con el Table Editor de Supabase.
-- Este archivo NO se ejecuta sobre la base actual: documenta el modelo.
-- ============================================================

create table public.universities (
  id_university integer      primary key,
  name          varchar(120) not null
);

create table public.users (
  document      varchar(20)  primary key,              -- cédula, sin puntos
  frt_name      varchar(50)  not null,
  scd_name      varchar(50),
  frt_last_name varchar(50)  not null,
  scd_last_name varchar(50),
  phne_number   varchar(15)  not null,
  user_type     varchar(20)  not null,                 -- 'Estudiante' | 'Externo'
  status        char(1)      not null default 'A',      -- 'A' activo | 'I' inactivo
  id_university integer      references public.universities (id_university),
  email         varchar(120) not null unique,          -- une la fila con auth.users
  description   text
);

create table public.offers (
  id_offer          varchar(10) primary key,           -- 'OFR-12345'
  type_offer        varchar(20) not null,              -- Trabajo | Tutoría | Mensajería | Servicio
  description       text        not null,              -- título, detalle, ubicación y fecha
  create_at         timestamptz not null default now(),
  status            varchar(20) not null,              -- Pendiente | Activa | En curso | Cerrada | Finalizada
  document_employer varchar(20) not null references public.users (document),
  document_employee varchar(20)          references public.users (document)
);

create table public.job_details (
  id_offer varchar(10)   primary key references public.offers (id_offer),
  category varchar(40)   not null,
  payment  numeric(12,2) not null,                     -- pesos colombianos
  hours    integer
);

create table public.aplications (
  id_offer   varchar(10) not null,
  document   varchar(20) not null references public.users (document),
  app_status varchar(20) not null default 'Pendiente', -- Pendiente | Aceptada | Rechazada
  constraint aplications_pk primary key (id_offer, document),
  constraint apn_ofr_fk foreign key (id_offer) references public.offers (id_offer)
);

create table public.ratings (
  id_offer       varchar(10) not null references public.offers (id_offer),
  document_rater varchar(20) not null references public.users (document),
  document_rated varchar(20) not null references public.users (document),
  score          integer     not null check (score between 1 and 5),
  comment        text,
  constraint ratings_pk primary key (id_offer, document_rater, document_rated)
);

create table public.notifications (
  id            serial      primary key,
  user_document varchar(20) not null references public.users (document),
  type          varchar(40) not null,
  message       text        not null,
  is_read       boolean     not null default false,
  created_at    timestamptz not null default now()
);

create table public.conversations (
  id            varchar(12) primary key,               -- 'CONV-123456'
  id_offer      varchar(10),
  participant_a varchar(20) not null,
  participant_b varchar(20) not null,
  subject       varchar(60),
  last_message  text,
  created_at    timestamptz not null default now(),
  last_read_a   timestamptz,
  last_read_b   timestamptz,
  constraint conversations_offer_fk         foreign key (id_offer)      references public.offers (id_offer),
  constraint conversations_participant_a_fk foreign key (participant_a) references public.users (document),
  constraint conversations_participant_b_fk foreign key (participant_b) references public.users (document)
);

create table public.messages (
  id              bigserial   primary key,
  conversation_id varchar(12) not null references public.conversations (id) on delete cascade,
  sender_document varchar(20) not null references public.users (document),
  body            text        not null check (char_length(btrim(body)) > 0),
  created_at      timestamptz not null default now()
);

create index idx_messages_conversation_created on public.messages (conversation_id, created_at);
