-- =====================================================================
-- Allô Réparateur — espace administrateur
--
-- Même principe que 0001 : aucun accès direct aux tables. Chaque fonction
-- admin_* commence par vérifier que l'appelant a le rôle « admin » dans
-- public.profiles. Le rôle ne peut être attribué que depuis le SQL Editor
-- (jamais par l'application) :
--
--   update public.profiles set role = 'admin' where phone_number = '+221...';
-- =====================================================================

-- Note interne sur un artisan (ex. « CNI vue, appelé le 12/11 ») — jamais renvoyée aux artisans ni aux clients
alter table public.repairman_profiles add column if not exists admin_note text
  check (char_length(admin_note) <= 500);

-- Journal des actions des administrateurs
create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,                 -- set_verification | cancel_request | set_auto_verify
  target_type text,                     -- repairman | request | setting
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_admin_actions_created on public.admin_actions (created_at desc);

alter table public.admin_actions enable row level security;
revoke all on public.admin_actions from anon, authenticated;

-- my_profile() renvoyait toute la ligne de l'artisan : on en retire la note interne
-- (les droits d'exécution déjà accordés sont conservés par « create or replace »)
create or replace function public.my_profile() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return null; end if;
  return jsonb_build_object(
    'profile', (select to_jsonb(p) from public.profiles p where p.id = uid),
    'repairman', (select to_jsonb(r) - 'admin_note' from public.repairman_profiles r where r.user_id = uid)
  );
end $$;

-- ---------------------------------------------------------------------
-- Contrôle d'accès
-- ---------------------------------------------------------------------
create or replace function public._require_admin() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := public._require_user();
begin
  if not exists (select 1 from public.profiles where id = uid and role = 'admin') then
    raise exception 'Accès réservé aux administrateurs' using errcode = '42501';
  end if;
  return uid;
end $$;

-- ---------------------------------------------------------------------
-- Tableau de bord
-- ---------------------------------------------------------------------
create or replace function public.admin_stats() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  today_start timestamptz := date_trunc('day', now() at time zone 'Africa/Dakar') at time zone 'Africa/Dakar';
begin
  perform public._require_admin();
  perform public._expire_overdue();

  return jsonb_build_object(
    'users_total', (select count(*) from public.profiles where role <> 'admin'),
    'repairmen_total', (select count(*) from public.repairman_profiles),
    'repairmen_pending', (select count(*) from public.repairman_profiles where verification_status = 'pending'),
    'repairmen_verified', (select count(*) from public.repairman_profiles where verification_status = 'verified'),
    'repairmen_rejected', (select count(*) from public.repairman_profiles where verification_status = 'rejected'),
    'repairmen_online', (select count(*) from public.repairman_profiles where verification_status = 'verified' and is_active),
    'requests_total', (select count(*) from public.requests),
    'requests_today', (select count(*) from public.requests where created_at >= today_start),
    'requests_7d', (select count(*) from public.requests where created_at >= now() - interval '7 days'),
    'by_status', (
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
      from (select status, count(*) as n from public.requests group by status) s
    ),
    -- parmi les demandes qui ont reçu une issue : part de celles acceptées
    'accept_rate', (
      select case when count(*) = 0 then null
                  else round(100.0 * count(*) filter (where status in ('acceptee', 'terminee')) / count(*)) end
      from public.requests where status in ('acceptee', 'terminee', 'refusee', 'expiree')
    ),
    'avg_response_minutes', (
      select round((avg(extract(epoch from (responded_at - created_at))) / 60)::numeric, 1)
      from public.requests
      where responded_at is not null and status in ('acceptee', 'terminee', 'refusee')
    ),
    'notifications_queued', (select count(*) from public.notification_logs where status = 'queued'),
    'auto_verify', coalesce((select (value)::boolean from public.app_settings where key = 'auto_verify_repairmen'), false),
    'daily', (
      select jsonb_agg(jsonb_build_object('day', to_char(days.dd, 'YYYY-MM-DD'), 'n', coalesce(c.n, 0)) order by days.dd)
      from (select ((now() at time zone 'Africa/Dakar')::date - g) as dd from generate_series(0, 13) g) days
      left join (
        select (created_at at time zone 'Africa/Dakar')::date as day, count(*)::int as n
        from public.requests group by 1
      ) c on c.day = days.dd
    )
  );
end $$;

-- ---------------------------------------------------------------------
-- Artisans
-- ---------------------------------------------------------------------
create or replace function public.admin_list_repairmen(p_status text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin();
  if p_status is not null and p_status not in ('pending', 'verified', 'rejected') then
    raise exception 'Statut invalide';
  end if;

  return coalesce((
    select jsonb_agg(row_json order by sort_key, created desc) from (
      select
        (r.verification_status <> 'pending') as sort_key,
        r.created_at as created,
        jsonb_build_object(
          'id', r.id,
          'name', p.full_name,
          'phone', p.phone_number,
          'quarter', p.city_or_quarter,
          'primary_trade', r.primary_trade,
          'secondary_trade', r.secondary_trade,
          'zone', r.intervention_zone,
          'fee', r.diagnostic_fee_fcfa,
          'available_days', r.available_days,
          'start_hour', to_char(r.start_hour, 'HH24:MI'),
          'end_hour', to_char(r.end_hour, 'HH24:MI'),
          'is_active', r.is_active,
          'verification_status', r.verification_status,
          'admin_note', r.admin_note,
          'jobs_done', r.completed_jobs_count,
          'requests_received', (select count(*) from public.requests q where q.repairman_id = r.id),
          'requests_accepted', (select count(*) from public.requests q
                                where q.repairman_id = r.id and q.status in ('acceptee', 'terminee')),
          'created_at', r.created_at
        ) as row_json
      from public.repairman_profiles r
      join public.profiles p on p.id = r.user_id
      where p_status is null or r.verification_status::text = p_status
      order by (r.verification_status <> 'pending'), r.created_at desc
      limit 300
    ) t
  ), '[]'::jsonb);
end $$;

-- Valider, refuser ou remettre en attente un artisan.
-- Si l'artisan n'est plus « validé », ses demandes en attente sont refusées pour que les clients
-- puissent se tourner tout de suite vers un autre artisan.
create or replace function public.admin_set_verification(p_repairman_id uuid, p_status text, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  aid uuid := public._require_admin();
  rep public.repairman_profiles;
  affected int := 0;
begin
  if p_status is null or p_status not in ('pending', 'verified', 'rejected') then
    raise exception 'Statut invalide';
  end if;

  select * into rep from public.repairman_profiles where id = p_repairman_id for update;
  if not found then raise exception 'Artisan introuvable'; end if;

  update public.repairman_profiles
    set verification_status = p_status::public.verification_status,
        admin_note = case when p_note is null then admin_note else nullif(trim(p_note), '') end
    where id = p_repairman_id;

  if p_status <> 'verified' then
    with refused as (
      update public.requests set status = 'refusee', responded_at = now()
      where repairman_id = p_repairman_id and status = 'en_attente'
      returning id, client_id
    ), logged as (
      insert into public.notification_logs (request_id, recipient_phone, recipient_role, event_type)
      select f.id, c.phone_number, 'client', 'rejected'
      from refused f join public.profiles c on c.id = f.client_id
      returning 1
    )
    select count(*) into affected from refused;
  end if;

  insert into public.admin_actions (admin_id, action, target_type, target_id, details)
  values (aid, 'set_verification', 'repairman', p_repairman_id, jsonb_build_object(
    'from', rep.verification_status, 'to', p_status,
    'note', nullif(trim(coalesce(p_note, '')), ''), 'requests_refused', affected));

  return jsonb_build_object('id', p_repairman_id, 'verification_status', p_status, 'requests_refused', affected);
end $$;

-- ---------------------------------------------------------------------
-- Demandes
-- Nom et téléphone visibles (l'équipe doit pouvoir appeler), mais l'adresse précise reste masquée
-- tant que l'artisan n'a pas accepté, comme pour tout le monde.
-- ---------------------------------------------------------------------
create or replace function public.admin_list_requests(p_status text default null, p_limit int default 50, p_offset int default 0)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  lim int := least(greatest(coalesce(p_limit, 50), 1), 100);
  skip_n int := greatest(coalesce(p_offset, 0), 0);
  total int;
begin
  perform public._require_admin();
  if p_status is not null and p_status not in ('en_attente', 'acceptee', 'refusee', 'annulee', 'terminee', 'expiree') then
    raise exception 'Statut invalide';
  end if;
  perform public._expire_overdue();

  select count(*) into total from public.requests r where p_status is null or r.status::text = p_status;

  return jsonb_build_object('total', total, 'items', coalesce((
    select jsonb_agg(row_json order by created desc) from (
      select
        r.created_at as created,
        jsonb_build_object(
          'id', r.id,
          'status', r.status,
          'trade', r.trade,
          'timing', r.timing,
          'quarter', r.quarter,
          'created_at', r.created_at,
          'response_deadline', r.response_deadline,
          'responded_at', r.responded_at,
          'completed_at', r.completed_at,
          'fee', r.diagnostic_fee_fcfa,
          'description', left(r.written_description, 300),
          'has_audio', r.audio_path is not null,
          'has_photo', r.photo_path is not null,
          'is_rebound', r.rebound_from_request_id is not null,
          'client_name', cp.full_name,
          'client_phone', cp.phone_number,
          'repairman_id', r.repairman_id,
          'repairman_name', ru.full_name,
          'repairman_phone', ru.phone_number,
          'address', case when r.status in ('acceptee', 'terminee') then r.intervention_address end
        ) as row_json
      from public.requests r
      join public.repairman_profiles rp on rp.id = r.repairman_id
      join public.profiles ru on ru.id = rp.user_id
      join public.profiles cp on cp.id = r.client_id
      where p_status is null or r.status::text = p_status
      order by r.created_at desc
      limit lim offset skip_n
    ) t
  ), '[]'::jsonb));
end $$;

-- Annulation par l'équipe (demande bloquée, litige…)
create or replace function public.admin_cancel_request(p_id uuid, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  aid uuid := public._require_admin();
  req public.requests;
  client_phone text;
  repairman_phone text;
begin
  select * into req from public.requests where id = p_id for update;
  if not found then raise exception 'Demande introuvable'; end if;
  if req.status not in ('en_attente', 'acceptee') then
    raise exception 'Cette demande ne peut plus être annulée (%).', req.status;
  end if;

  update public.requests set status = 'annulee', responded_at = coalesce(responded_at, now()) where id = p_id;

  select phone_number into client_phone from public.profiles where id = req.client_id;
  select p.phone_number into repairman_phone
    from public.repairman_profiles rp join public.profiles p on p.id = rp.user_id where rp.id = req.repairman_id;
  insert into public.notification_logs (request_id, recipient_phone, recipient_role, event_type) values
    (p_id, client_phone, 'client', 'cancelled_by_admin'),
    (p_id, repairman_phone, 'repairman', 'cancelled_by_admin');

  insert into public.admin_actions (admin_id, action, target_type, target_id, details)
  values (aid, 'cancel_request', 'request', p_id,
          jsonb_build_object('from', req.status, 'reason', nullif(trim(coalesce(p_reason, '')), '')));

  return jsonb_build_object('id', p_id, 'status', 'annulee');
end $$;

-- ---------------------------------------------------------------------
-- Réglages et journal
-- ---------------------------------------------------------------------
create or replace function public.admin_set_auto_verify(p_value boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare aid uuid := public._require_admin();
begin
  if p_value is null then raise exception 'Valeur invalide'; end if;
  insert into public.app_settings (key, value) values ('auto_verify_repairmen', to_jsonb(p_value))
  on conflict (key) do update set value = excluded.value;

  insert into public.admin_actions (admin_id, action, target_type, details)
  values (aid, 'set_auto_verify', 'setting', jsonb_build_object('value', p_value));

  return jsonb_build_object('auto_verify', p_value);
end $$;

create or replace function public.admin_list_actions(p_limit int default 30) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin();
  return coalesce((
    select jsonb_agg(row_json order by created desc) from (
      select
        a.created_at as created,
        jsonb_build_object(
          'id', a.id,
          'action', a.action,
          'target_type', a.target_type,
          'target_id', a.target_id,
          'target_name', tp.full_name,
          'admin_name', ap.full_name,
          'details', a.details,
          'created_at', a.created_at
        ) as row_json
      from public.admin_actions a
      left join public.profiles ap on ap.id = a.admin_id
      left join public.repairman_profiles tr on a.target_type = 'repairman' and tr.id = a.target_id
      left join public.profiles tp on tp.id = tr.user_id
      order by a.created_at desc
      limit least(greatest(coalesce(p_limit, 30), 1), 100)
    ) t
  ), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------
-- Droits d'exécution
-- ---------------------------------------------------------------------
revoke all on function public._require_admin() from public, anon, authenticated;

revoke all on function
  public.admin_stats(),
  public.admin_list_repairmen(text),
  public.admin_set_verification(uuid, text, text),
  public.admin_list_requests(text, int, int),
  public.admin_cancel_request(uuid, text),
  public.admin_set_auto_verify(boolean),
  public.admin_list_actions(int)
from public, anon;

grant execute on function
  public.admin_stats(),
  public.admin_list_repairmen(text),
  public.admin_set_verification(uuid, text, text),
  public.admin_list_requests(text, int, int),
  public.admin_cancel_request(uuid, text),
  public.admin_set_auto_verify(boolean),
  public.admin_list_actions(int)
to authenticated;
