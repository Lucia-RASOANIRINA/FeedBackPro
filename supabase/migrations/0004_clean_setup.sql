-- =============================================================================
-- FeedbackPro — Migration propre, idempotente et AUTO-SUFFISANTE.
-- =============================================================================
-- Objectif : garantir que le projet Supabase possède TOUTES les tables et
-- colonnes dont l'application a besoin pour que la synchronisation des
-- feedbacks fonctionne (l'icône de synchro passe au vert).
--
-- - « create table if not exists » / « add column if not exists » : ne casse
--   rien si le schéma existe déjà, complète ce qui manque.
-- - Peut être exécutée seule sur un projet vide, ou après 0001..0003.
-- - Assouplit la validation serveur qui rejetait des feedbacks légitimes
--   (note basse sans détails, critique sans photo) et bloquait la synchro.
--
-- À exécuter dans Supabase → SQL Editor (projet bwkqzmdodbewhbrvkzpv).
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Types (créés seulement s'ils n'existent pas).
-- -----------------------------------------------------------------------------
do $$ begin
  create type feedback_status as enum ('submitted', 'in_progress', 'resolved');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- 1) ADMINS
-- -----------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'super_admin',
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.admins add column if not exists role text not null default 'super_admin';
alter table public.admins add column if not exists display_name text;

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- -----------------------------------------------------------------------------
-- 2) ESTABLISHMENTS
-- -----------------------------------------------------------------------------
create table if not exists public.establishments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sector_id text not null,
  address text,
  latitude double precision,
  longitude double precision,
  qr_code text unique,
  created_at timestamptz not null default now()
);
create index if not exists idx_establishments_sector on public.establishments (sector_id);

-- -----------------------------------------------------------------------------
-- 3) TEMPLATES
-- -----------------------------------------------------------------------------
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  sector_id text not null,
  title text not null,
  questions jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 4) FEEDBACKS (avec TOUTES les colonnes attendues par l'app)
-- -----------------------------------------------------------------------------
create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  client_uuid text unique,
  establishment_id uuid references public.establishments (id) on delete set null,
  sector_id text not null,
  rating_normalized int not null default 0 check (rating_normalized between 0 and 100),
  rating_raw int,
  rating_type text not null default 'stars',
  comment text,
  suggestion text,
  answers jsonb default '{}'::jsonb,
  photo_urls text[] default '{}',
  has_location boolean not null default false,
  latitude double precision,
  longitude double precision,
  anon_code text not null,
  moderation_status text not null default 'new'
    check (moderation_status in ('new','validated','hidden','resolved')),
  status feedback_status not null default 'submitted',
  priority boolean not null default false,
  is_critical boolean not null default false,
  problem_details text,
  problem_types text[] default '{}',
  video_url text,
  sentiment text check (sentiment in ('positive','neutral','negative')),
  themes text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Complète les colonnes si la table existait déjà (projet partiellement migré).
alter table public.feedbacks add column if not exists client_uuid text;
alter table public.feedbacks add column if not exists rating_raw int;
alter table public.feedbacks add column if not exists rating_type text not null default 'stars';
alter table public.feedbacks add column if not exists suggestion text;
alter table public.feedbacks add column if not exists photo_urls text[] default '{}';
alter table public.feedbacks add column if not exists has_location boolean not null default false;
alter table public.feedbacks add column if not exists latitude double precision;
alter table public.feedbacks add column if not exists longitude double precision;
alter table public.feedbacks add column if not exists status feedback_status not null default 'submitted';
alter table public.feedbacks add column if not exists priority boolean not null default false;
alter table public.feedbacks add column if not exists is_critical boolean not null default false;
alter table public.feedbacks add column if not exists problem_details text;
alter table public.feedbacks add column if not exists problem_types text[] default '{}';
alter table public.feedbacks add column if not exists video_url text;
alter table public.feedbacks add column if not exists sentiment text;
alter table public.feedbacks add column if not exists themes text[] default '{}';
alter table public.feedbacks add column if not exists updated_at timestamptz not null default now();
-- Unicité de client_uuid (idempotence de la synchro offline).
create unique index if not exists uq_feedbacks_client_uuid
  on public.feedbacks (client_uuid) where client_uuid is not null;
create index if not exists idx_feedbacks_created on public.feedbacks (created_at desc);
create index if not exists idx_feedbacks_anon on public.feedbacks (anon_code);

-- -----------------------------------------------------------------------------
-- 5) CONVERSATION_MESSAGES (2-way anonyme)
-- -----------------------------------------------------------------------------
create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedbacks (id) on delete cascade,
  anon_code text not null,
  sender text not null check (sender in ('user','admin')),
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_msg_feedback on public.conversation_messages (feedback_id);

-- -----------------------------------------------------------------------------
-- 6) IMPROVEMENTS (page publique avant/après)
-- -----------------------------------------------------------------------------
create table if not exists public.improvements (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references public.establishments (id) on delete set null,
  feedback_id uuid references public.feedbacks (id) on delete set null,
  title text not null,
  description text,
  before_photo_url text,
  after_photo_url text,
  published_at timestamptz not null default now()
);
create index if not exists idx_improvements_published on public.improvements (published_at desc);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.admins                enable row level security;
alter table public.establishments        enable row level security;
alter table public.templates             enable row level security;
alter table public.feedbacks             enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.improvements          enable row level security;

-- On (re)crée les policies de façon idempotente.
drop policy if exists "admins_select_admin_only" on public.admins;
create policy "admins_select_admin_only" on public.admins
  for select using (public.is_admin());

drop policy if exists "establishments_public_read" on public.establishments;
create policy "establishments_public_read" on public.establishments
  for select using (true);
drop policy if exists "establishments_admin_write" on public.establishments;
create policy "establishments_admin_write" on public.establishments
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "templates_public_read" on public.templates;
create policy "templates_public_read" on public.templates
  for select using (is_active or public.is_admin());
drop policy if exists "templates_admin_write" on public.templates;
create policy "templates_admin_write" on public.templates
  for all using (public.is_admin()) with check (public.is_admin());

-- FEEDBACKS : insertion ouverte aux sessions authentifiées (= anonyme Supabase),
-- lecture / modération réservées aux admins.
drop policy if exists "feedbacks_anon_insert" on public.feedbacks;
create policy "feedbacks_anon_insert" on public.feedbacks
  for insert to authenticated with check (true);
drop policy if exists "feedbacks_admin_select" on public.feedbacks;
create policy "feedbacks_admin_select" on public.feedbacks
  for select using (public.is_admin());
drop policy if exists "feedbacks_admin_update" on public.feedbacks;
create policy "feedbacks_admin_update" on public.feedbacks
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "feedbacks_admin_delete" on public.feedbacks;
create policy "feedbacks_admin_delete" on public.feedbacks
  for delete using (public.is_admin());

drop policy if exists "messages_user_insert" on public.conversation_messages;
create policy "messages_user_insert" on public.conversation_messages
  for insert to authenticated with check (sender = 'user');
drop policy if exists "messages_admin_insert" on public.conversation_messages;
create policy "messages_admin_insert" on public.conversation_messages
  for insert to authenticated with check (sender = 'admin' and public.is_admin());
drop policy if exists "messages_admin_select" on public.conversation_messages;
create policy "messages_admin_select" on public.conversation_messages
  for select using (public.is_admin());

drop policy if exists "improvements_public_read" on public.improvements;
create policy "improvements_public_read" on public.improvements
  for select using (true);
drop policy if exists "improvements_admin_write" on public.improvements;
create policy "improvements_admin_write" on public.improvements
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- RPC : récupération anonyme d'une conversation via anon_code.
-- =============================================================================
create or replace function public.get_conversation(p_anon_code text)
returns setof public.conversation_messages
language sql security definer set search_path = public as $$
  select * from public.conversation_messages
  where anon_code = p_anon_code
  order by created_at asc;
$$;

-- =============================================================================
-- VALIDATION SERVEUR ASSOUPLIE.
-- L'ancien trigger rejetait les feedbacks a note basse sans details, et les
-- feedbacks critiques sans photo : cela BLOQUAIT la synchronisation depuis
-- l'app (ou la note/les details sont facultatifs). On tient a jour `updated_at`
-- sans jamais rejeter un insert legitime.
-- =============================================================================
create or replace function public.feedbacks_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_feedbacks_validate on public.feedbacks;  -- ancien, bloquant
drop trigger if exists trg_feedbacks_touch on public.feedbacks;
create trigger trg_feedbacks_touch
  before insert or update on public.feedbacks
  for each row execute function public.feedbacks_touch();

-- =============================================================================
-- STORAGE : buckets photos (upload anonyme feedback, écriture admin amélioration).
-- =============================================================================
insert into storage.buckets (id, name, public)
values
  ('feedback-photos', 'feedback-photos', true),
  ('improvement-photos', 'improvement-photos', true)
on conflict (id) do nothing;

drop policy if exists "public_read_feedback_photos" on storage.objects;
create policy "public_read_feedback_photos" on storage.objects
  for select using (bucket_id = 'feedback-photos');
drop policy if exists "public_read_improvement_photos" on storage.objects;
create policy "public_read_improvement_photos" on storage.objects
  for select using (bucket_id = 'improvement-photos');
drop policy if exists "anon_upload_feedback_photos" on storage.objects;
create policy "anon_upload_feedback_photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'feedback-photos');
drop policy if exists "admin_write_improvement_photos" on storage.objects;
create policy "admin_write_improvement_photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'improvement-photos' and public.is_admin());

-- =============================================================================
-- Vérifications rapides (doivent renvoyer des lignes / ne pas échouer).
-- =============================================================================
-- select count(*) from public.feedbacks;
-- select count(*) from public.improvements;
