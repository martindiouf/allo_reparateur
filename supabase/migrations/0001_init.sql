-- =====================================================================
-- Allô Réparateur — schéma initial (Supabase / PostgreSQL 15+)
--
-- Principe de sécurité : AUCUN accès direct aux tables depuis le navigateur.
-- Tout passe par des fonctions (RPC) qui vérifient qui appelle et qui masquent
-- le téléphone et l'adresse précise tant que l'artisan n'a pas accepté.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
create type public.user_role as enum ('client', 'repairman', 'admin');
create type public.craft_trade as enum ('electricien', 'plombier', 'macon', 'menuisier', 'peintre', 'climaticien', 'autre');
create type public.timing_preference as enum ('asap', 'today', 'tomorrow');
create type public.request_status as enum ('en_attente', 'acceptee', 'refusee', 'annulee', 'terminee', 'expiree');
create type public.verification_status as enum ('pending', 'verified', 'rejected');

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'client',
  full_name text not null check (char_length(full_name) between 2 and 80),
  phone_number text not null unique check (char_length(phone_number) between 9 and 20),
  city_or_quarter text not null,
  address_landmark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.repairman_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  primary_trade public.craft_trade not null,
  secondary_trade public.craft_trade,
  intervention_zone text not null default 'Dakar et banlieue',
  available_days jsonb not null default '["lundi","mardi","mercredi","jeudi","vendredi","samedi"]'::jsonb,
  start_hour time not null default '08:00',
  end_hour time not null default '19:00',
  is_active boolean not null default true,                       -- interrupteur « Je suis disponible »
  verification_status public.verification_status not null default 'pending',
  diagnostic_fee_fcfa int not null default 2500 check (diagnostic_fee_fcfa between 0 and 100000),
  rating_score numeric(2, 1),                                    -- null = nouvel artisan, pas encore noté
  ratings_count int not null default 0,
  completed_jobs_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (secondary_trade is null or secondary_trade <> primary_trade)
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete restrict,
  repairman_id uuid not null references public.repairman_profiles (id) on delete restrict,
  trade public.craft_trade not null,
  written_description text check (char_length(written_description) <= 1000),
  audio_path text,
  audio_duration_seconds int check (audio_duration_seconds between 1 and 60),
  audio_mime text,
  photo_path text,
  timing public.timing_preference not null default 'asap',
  intervention_address text not null check (char_length(intervention_address) between 3 and 300),
  quarter text not null,
  diagnostic_fee_fcfa int not null default 2500,
  status public.request_status not null default 'en_attente',
  response_deadline timestamptz not null,
  rebound_from_request_id uuid references public.requests (id),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  completed_at timestamptz,
  check (written_description is not null or audio_path is not null)
);

-- File d'envoi des notifications (WhatsApp / SMS) : l'envoi réel sera fait par une Edge Function
create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.requests (id) on delete cascade,
  recipient_phone text not null,
  recipient_role public.user_role not null,
  channel text not null default 'whatsapp',
  event_type text not null,             -- new_request | accepted | rejected | expired | completed
  status text not null default 'queued', -- queued | sent | delivered | failed
  external_message_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key,
  value jsonb not null
);

-- Tant qu'il n'y a pas de page admin : les artisans sont vérifiés automatiquement.
-- Passer à false pour exiger une validation manuelle (appel + photo CNI).
insert into public.app_settings (key, value) values ('auto_verify_repairmen', 'true'::jsonb);

create index idx_repairmen_search on public.repairman_profiles (is_active, verification_status);
create index idx_requests_client on public.requests (client_id, created_at desc);
create index idx_requests_repairman on public.requests (repairman_id, created_at desc);
create index idx_requests_status_deadline on public.requests (status, response_deadline);

-- ---------------------------------------------------------------------
-- Verrouillage : RLS activée, aucune politique, aucun droit direct
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.repairman_profiles enable row level security;
alter table public.requests enable row level security;
alter table public.notification_logs enable row level security;
alter table public.app_settings enable row level security;

revoke all on public.profiles, public.repairman_profiles, public.requests,
              public.notification_logs, public.app_settings from anon, authenticated;

-- ---------------------------------------------------------------------
-- Utilitaires internes
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger trg_repairmen_touch before update on public.repairman_profiles
  for each row execute function public.touch_updated_at();

create or replace function public._require_user() returns uuid
language plpgsql stable set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Connexion requise' using errcode = '28000';
  end if;
  return uid;
end $$;

-- L'artisan est-il en horaire d'ouverture maintenant (heure de Dakar) ?
create or replace function public._is_open_now(p_days jsonb, p_start time, p_end time) returns boolean
language sql stable set search_path = public as $$
  select p_days ? (array['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'])
                    [extract(isodow from (now() at time zone 'Africa/Dakar'))::int]
     and (now() at time zone 'Africa/Dakar')::time between p_start and p_end
$$;

-- Passe en « expirée » les demandes dont le délai de réponse est dépassé
create or replace function public._expire_overdue() returns void
language sql set search_path = public as $$
  with expired as (
    update public.requests set status = 'expiree'
    where status = 'en_attente' and response_deadline < now()
    returning id, client_id
  )
  insert into public.notification_logs (request_id, recipient_phone, recipient_role, event_type)
  select e.id, p.phone_number, 'client', 'expired'
  from expired e join public.profiles p on p.id = e.client_id
$$;

-- ---------------------------------------------------------------------
-- Inscription / profils
-- ---------------------------------------------------------------------
create or replace function public.register_client(
  p_full_name text, p_phone text, p_quarter text, p_landmark text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_user();
begin
  insert into public.profiles (id, full_name, phone_number, city_or_quarter, address_landmark)
  values (uid, trim(p_full_name), trim(p_phone), p_quarter, nullif(trim(coalesce(p_landmark, '')), ''))
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone_number = excluded.phone_number,
    city_or_quarter = excluded.city_or_quarter,
    address_landmark = excluded.address_landmark;
  return public.my_profile();
end $$;

create or replace function public.register_repairman(
  p_full_name text, p_phone text, p_primary_trade public.craft_trade,
  p_secondary_trade public.craft_trade, p_quarter text, p_zone text,
  p_days jsonb, p_start time, p_end time, p_fee int
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public._require_user();
  auto_verify boolean := coalesce((select (value)::boolean from public.app_settings where key = 'auto_verify_repairmen'), false);
begin
  if p_days is null or jsonb_typeof(p_days) <> 'array' or jsonb_array_length(p_days) = 0 then
    raise exception 'Choisissez au moins un jour de travail';
  end if;

  insert into public.profiles (id, full_name, phone_number, city_or_quarter)
  values (uid, trim(p_full_name), trim(p_phone), p_quarter)
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone_number = excluded.phone_number;

  insert into public.repairman_profiles (
    user_id, primary_trade, secondary_trade, intervention_zone, available_days,
    start_hour, end_hour, diagnostic_fee_fcfa, verification_status
  ) values (
    uid, p_primary_trade, p_secondary_trade, coalesce(nullif(trim(p_zone), ''), 'Dakar et banlieue'),
    p_days, p_start, p_end, coalesce(p_fee, 2500),
    case when auto_verify then 'verified' else 'pending' end::public.verification_status
  )
  on conflict (user_id) do update set
    primary_trade = excluded.primary_trade,
    secondary_trade = excluded.secondary_trade,
    intervention_zone = excluded.intervention_zone,
    available_days = excluded.available_days,
    start_hour = excluded.start_hour,
    end_hour = excluded.end_hour,
    diagnostic_fee_fcfa = excluded.diagnostic_fee_fcfa;

  -- le quartier de l'artisan est stocké sur son profil de base
  update public.profiles set city_or_quarter = p_quarter where id = uid and role <> 'admin';
  return public.my_profile();
end $$;

create or replace function public.my_profile() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return null; end if;
  return jsonb_build_object(
    'profile', (select to_jsonb(p) from public.profiles p where p.id = uid),
    'repairman', (select to_jsonb(r) from public.repairman_profiles r where r.user_id = uid)
  );
end $$;

create or replace function public.set_availability(p_active boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_user();
begin
  update public.repairman_profiles set is_active = p_active where user_id = uid;
  if not found then raise exception 'Profil artisan introuvable'; end if;
  return public.my_profile();
end $$;

-- ---------------------------------------------------------------------
-- Annuaire public (sans téléphone)
-- ---------------------------------------------------------------------
create or replace function public.list_repairmen() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := public._require_user();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id,
      'name', p.full_name,
      'primary_trade', r.primary_trade,
      'secondary_trade', r.secondary_trade,
      'quarter', p.city_or_quarter,
      'intervention_zone', r.intervention_zone,
      'rating', r.rating_score,
      'ratings_count', r.ratings_count,
      'diagnostic_fee', r.diagnostic_fee_fcfa,
      'start_hour', to_char(r.start_hour, 'HH24:MI'),
      'end_hour', to_char(r.end_hour, 'HH24:MI'),
      'available_days', r.available_days,
      'is_verified', r.verification_status = 'verified',
      'is_available_now', public._is_open_now(r.available_days, r.start_hour, r.end_hour)
    ) order by r.rating_score desc nulls last, r.created_at)
    from public.repairman_profiles r
    join public.profiles p on p.id = r.user_id
    where r.is_active and r.verification_status = 'verified' and r.user_id <> uid
  ), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------
-- Demandes
-- ---------------------------------------------------------------------
create or replace function public.create_request(
  p_id uuid, p_repairman_id uuid, p_trade public.craft_trade, p_timing public.timing_preference,
  p_description text, p_audio_path text, p_audio_duration int, p_audio_mime text,
  p_photo_path text, p_address text, p_quarter text, p_rebound_from uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public._require_user();
  rep public.repairman_profiles;
  rep_phone text;
  deadline timestamptz;
  new_id uuid := coalesce(p_id, gen_random_uuid());
begin
  perform public._expire_overdue();

  if not exists (select 1 from public.profiles where id = uid) then
    raise exception 'Complétez votre profil avant de faire une demande';
  end if;

  select * into rep from public.repairman_profiles where id = p_repairman_id;
  if not found or not rep.is_active or rep.verification_status <> 'verified' then
    raise exception 'Cet artisan n''est pas disponible';
  end if;
  if rep.user_id = uid then
    raise exception 'Vous ne pouvez pas vous envoyer une demande à vous-même';
  end if;
  if p_trade is distinct from rep.primary_trade and p_trade is distinct from rep.secondary_trade then
    raise exception 'Cet artisan ne fait pas ce métier';
  end if;
  if nullif(trim(coalesce(p_description, '')), '') is null and p_audio_path is null then
    raise exception 'Décrivez la panne à la voix ou par écrit';
  end if;
  -- les fichiers doivent être dans le dossier de l'utilisateur
  if (p_audio_path is not null and split_part(p_audio_path, '/', 1) <> uid::text)
     or (p_photo_path is not null and split_part(p_photo_path, '/', 1) <> uid::text) then
    raise exception 'Fichier invalide';
  end if;
  if exists (select 1 from public.requests where client_id = uid and status = 'en_attente') then
    raise exception 'Vous avez déjà une demande en attente de réponse';
  end if;

  deadline := now() + case p_timing
    when 'asap' then interval '15 minutes'
    when 'today' then interval '2 hours'
    else interval '24 hours' end;

  insert into public.requests (
    id, client_id, repairman_id, trade, written_description, audio_path, audio_duration_seconds,
    audio_mime, photo_path, timing, intervention_address, quarter, diagnostic_fee_fcfa,
    response_deadline, rebound_from_request_id
  ) values (
    new_id, uid, p_repairman_id, p_trade, nullif(trim(coalesce(p_description, '')), ''), p_audio_path,
    p_audio_duration, p_audio_mime, p_photo_path, p_timing, trim(p_address), p_quarter,
    rep.diagnostic_fee_fcfa, deadline, p_rebound_from
  );

  select phone_number into rep_phone from public.profiles where id = rep.user_id;
  insert into public.notification_logs (request_id, recipient_phone, recipient_role, event_type)
  values (new_id, rep_phone, 'repairman', 'new_request');

  return jsonb_build_object('id', new_id, 'status', 'en_attente', 'response_deadline', deadline);
end $$;

create or replace function public.respond_request(p_id uuid, p_action text) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public._require_user();
  req public.requests;
  client_phone text;
begin
  if p_action not in ('accept', 'reject') then
    raise exception 'Action invalide';
  end if;
  perform public._expire_overdue();

  select r.* into req from public.requests r
  join public.repairman_profiles rp on rp.id = r.repairman_id
  where r.id = p_id and rp.user_id = uid
  for update of r;
  if not found then raise exception 'Demande introuvable'; end if;
  if req.status <> 'en_attente' then
    raise exception 'Cette demande n''est plus en attente (%).', req.status;
  end if;

  update public.requests
    set status = case p_action when 'accept' then 'acceptee' else 'refusee' end::public.request_status,
        responded_at = now()
    where id = p_id;

  select phone_number into client_phone from public.profiles where id = req.client_id;
  insert into public.notification_logs (request_id, recipient_phone, recipient_role, event_type)
  values (p_id, client_phone, 'client', case p_action when 'accept' then 'accepted' else 'rejected' end);
end $$;

create or replace function public.cancel_request(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_user();
begin
  update public.requests set status = 'annulee', responded_at = now()
  where id = p_id and client_id = uid and status = 'en_attente';
  if not found then raise exception 'Cette demande ne peut plus être annulée'; end if;
end $$;

create or replace function public.complete_request(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_user();
begin
  update public.requests r set status = 'terminee', completed_at = now()
  from public.repairman_profiles rp
  where r.id = p_id and rp.id = r.repairman_id and rp.user_id = uid and r.status = 'acceptee';
  if not found then raise exception 'Cette intervention ne peut pas être clôturée'; end if;

  update public.repairman_profiles set completed_jobs_count = completed_jobs_count + 1 where user_id = uid;
end $$;

-- Liste des demandes de l'utilisateur, avec masquage des coordonnées.
--   p_as = 'client'    : demandes que j'ai envoyées
--   p_as = 'repairman' : demandes qui me sont adressées
create or replace function public.list_my_requests(p_as text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_user();
begin
  if p_as not in ('client', 'repairman') then raise exception 'Rôle invalide'; end if;
  perform public._expire_overdue();

  return coalesce((
    select jsonb_agg(row_json order by created desc) from (
      select
        r.created_at as created,
        jsonb_build_object(
          'id', r.id,
          'status', r.status,
          'trade', r.trade,
          'timing', r.timing,
          'quarter', r.quarter,
          'written_description', r.written_description,
          'audio_path', r.audio_path,
          'audio_duration_seconds', r.audio_duration_seconds,
          'photo_path', r.photo_path,
          'diagnostic_fee', r.diagnostic_fee_fcfa,
          'created_at', r.created_at,
          'response_deadline', r.response_deadline,
          'remaining_seconds', case when r.status = 'en_attente'
                                    then greatest(0, extract(epoch from (r.response_deadline - now()))::int) else 0 end,
          'repairman_id', r.repairman_id,
          'repairman_name', ru.full_name,
          'client_first_name', split_part(cp.full_name, ' ', 1),
          -- coordonnées : visibles seulement après acceptation
          'unlocked', r.status in ('acceptee', 'terminee'),
          'repairman_phone', case when p_as = 'client' and r.status in ('acceptee', 'terminee') then ru.phone_number end,
          'client_name', case when p_as = 'client' or r.status in ('acceptee', 'terminee') then cp.full_name end,
          'client_phone', case when p_as = 'client' or r.status in ('acceptee', 'terminee') then cp.phone_number end,
          'intervention_address', case when p_as = 'client' or r.status in ('acceptee', 'terminee')
                                       then r.intervention_address end
        ) as row_json
      from public.requests r
      join public.repairman_profiles rp on rp.id = r.repairman_id
      join public.profiles ru on ru.id = rp.user_id
      join public.profiles cp on cp.id = r.client_id
      where (p_as = 'client' and r.client_id = uid)
         or (p_as = 'repairman' and rp.user_id = uid)
      order by r.created_at desc
      limit 30
    ) t
  ), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------
-- Fichiers (messages vocaux, photos) : bucket privé
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'request-media', 'request-media', false, 5242880,
  array['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- L'artisan destinataire peut lire les fichiers de la demande qui lui est adressée
create or replace function public._can_read_media(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.requests r
    join public.repairman_profiles rp on rp.id = r.repairman_id
    where rp.user_id = auth.uid() and (r.audio_path = p_name or r.photo_path = p_name)
  )
$$;

create policy "media: dépôt dans son dossier" on storage.objects for insert to authenticated
  with check (bucket_id = 'request-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "media: lecture par l'auteur ou l'artisan destinataire" on storage.objects for select to authenticated
  using (bucket_id = 'request-media'
         and ((storage.foldername(name))[1] = auth.uid()::text or public._can_read_media(name)));

create policy "media: suppression par l'auteur" on storage.objects for delete to authenticated
  using (bucket_id = 'request-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- Droits d'exécution : réservés aux utilisateurs connectés
-- ---------------------------------------------------------------------
revoke all on function
  public.register_client(text, text, text, text),
  public.register_repairman(text, text, public.craft_trade, public.craft_trade, text, text, jsonb, time, time, int),
  public.my_profile(),
  public.set_availability(boolean),
  public.list_repairmen(),
  public.create_request(uuid, uuid, public.craft_trade, public.timing_preference, text, text, int, text, text, text, text, uuid),
  public.respond_request(uuid, text),
  public.cancel_request(uuid),
  public.complete_request(uuid),
  public.list_my_requests(text),
  public._expire_overdue(),
  public._can_read_media(text)
from public, anon;

grant execute on function
  public.register_client(text, text, text, text),
  public.register_repairman(text, text, public.craft_trade, public.craft_trade, text, text, jsonb, time, time, int),
  public.my_profile(),
  public.set_availability(boolean),
  public.list_repairmen(),
  public.create_request(uuid, uuid, public.craft_trade, public.timing_preference, text, text, int, text, text, text, text, uuid),
  public.respond_request(uuid, text),
  public.cancel_request(uuid),
  public.complete_request(uuid),
  public.list_my_requests(text),
  public._can_read_media(text)
to authenticated;

-- Supabase accorde par défaut l'exécution des nouvelles fonctions aux utilisateurs connectés :
-- on retire ce droit sur les fonctions purement internes.
revoke all on function
  public._expire_overdue(),
  public._require_user(),
  public._is_open_now(jsonb, time, time),
  public.touch_updated_at()
from public, anon, authenticated;
