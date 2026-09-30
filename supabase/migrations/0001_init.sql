-- Game On app schema.
-- Guests get anonymous Supabase auth sessions (enable "Anonymous sign-ins" in Auth settings),
-- so every write is tied to auth.uid() and protected by RLS.

-- ---------------------------------------------------------------------------
-- Staff (can manage content & redeem coupons). Add rows manually for bar staff accounts.
-- ---------------------------------------------------------------------------
create table public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);
alter table public.staff enable row level security;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

create policy "staff read staff" on public.staff for select using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Polls
-- ---------------------------------------------------------------------------
create table public.polls (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('food', 'drinks', 'events', 'debates')),
  question text not null,
  featured boolean not null default false,
  opens_at timestamptz not null default now(),
  closes_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  label text not null,
  emoji text,
  sort_order int not null default 0,
  votes int not null default 0 -- maintained by trigger; never written by clients
);
create index on public.poll_options (poll_id);

create table public.poll_votes (
  poll_id uuid not null references public.polls (id) on delete cascade,
  option_id uuid not null references public.poll_options (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id) -- one vote per guest per poll
);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

create policy "polls are public" on public.polls for select using (opens_at <= now());
create policy "options are public" on public.poll_options for select using (true);
create policy "staff manage polls" on public.polls for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage options" on public.poll_options for all using (public.is_staff()) with check (public.is_staff());
create policy "guests see own votes" on public.poll_votes for select using (user_id = auth.uid());
-- Inserts go through cast_vote(), which validates the poll is open and the option belongs to it.

create or replace function public.bump_option_votes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.poll_options set votes = votes + 1 where id = new.option_id;
  return new;
end;
$$;

create trigger poll_votes_count after insert on public.poll_votes
for each row execute function public.bump_option_votes();

create or replace function public.cast_vote(p_poll_id uuid, p_option_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Sign-in required' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.polls p join public.poll_options o on o.poll_id = p.id
    where p.id = p_poll_id and o.id = p_option_id and p.opens_at <= now() and p.closes_at > now()
  ) then
    raise exception 'This poll is closed or the option is invalid.';
  end if;
  insert into public.poll_votes (poll_id, option_id, user_id) values (p_poll_id, p_option_id, auth.uid());
exception when unique_violation then
  raise exception 'You already voted in this poll.';
end;
$$;
grant execute on function public.cast_vote(uuid, uuid) to authenticated;

-- "You Chose It, We Made It Happen"
create table public.showcase_items (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references public.polls (id) on delete set null,
  title text not null,
  description text not null,
  poll_question text not null,
  winning_share int not null check (winning_share between 0 and 100),
  launched_on date not null,
  status text not null check (status in ('on-menu', 'coming-soon', 'event-booked')),
  image_url text
);
alter table public.showcase_items enable row level security;
create policy "showcase is public" on public.showcase_items for select using (true);
create policy "staff manage showcase" on public.showcase_items for all using (public.is_staff()) with check (public.is_staff());

-- Menu "Coming Soon" tab (staff-curated; Toast only knows what's already on the menu)
create table public.coming_soon_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('food', 'drink')),
  title text not null,
  description text not null,
  eta_label text not null, -- free text: 'Mid-October', 'After voting closes'
  from_poll boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0
);
alter table public.coming_soon_items enable row level security;
create policy "coming soon is public" on public.coming_soon_items for select using (active);
create policy "staff manage coming soon" on public.coming_soon_items for all using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- Gameday & the 6 PM Surprise
-- ---------------------------------------------------------------------------
create table public.gameday_events (
  id uuid primary key default gen_random_uuid(),
  team text not null check (team in ('bengals', 'bearcats', 'reds', 'fcc')),
  opponent text not null,
  home_away text not null check (home_away in ('home', 'away')),
  starts_at timestamptz not null,
  broadcast text,
  specials text[] not null default '{}'
);
create index on public.gameday_events (starts_at);
alter table public.gameday_events enable row level security;
create policy "games are public" on public.gameday_events for select using (true);
create policy "staff manage games" on public.gameday_events for all using (public.is_staff()) with check (public.is_staff());

create table public.flash_deals (
  id uuid primary key default gen_random_uuid(),
  deal_date date not null unique, -- bar-local date
  title text not null,
  description text not null,
  fine_print text
);
alter table public.flash_deals enable row level security;
-- The surprise stays a surprise: guests can't read a deal until 6 PM bar time on its date.
create policy "deals visible after unlock" on public.flash_deals for select
  using (now() >= ((deal_date + time '18:00') at time zone 'America/New_York') or public.is_staff());
create policy "staff manage deals" on public.flash_deals for all using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- Coupons & redemptions
-- ---------------------------------------------------------------------------
create table public.coupons (
  id text primary key, -- e.g. 'c-free-app'
  kind text not null check (kind in ('free-app', 'kids-meal', 'wings-bogo', 'half-apps')),
  title text not null,
  description text not null,
  fine_print text not null default '',
  expires_on date not null,
  single_use boolean not null default true,
  tracker_goal int, -- set for progress-style promos (e.g. 5 happy-hour visits)
  tracker_unit text,
  toast_discount_guid text, -- the Toast discount staff apply when redeeming
  active boolean not null default true,
  sort_order int not null default 0
);
alter table public.coupons enable row level security;
create policy "coupons are public" on public.coupons for select using (active and expires_on >= current_date);
create policy "staff manage coupons" on public.coupons for all using (public.is_staff()) with check (public.is_staff());

create table public.coupon_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  coupon_id text not null references public.coupons (id) on delete cascade,
  current int not null default 0,
  primary key (user_id, coupon_id)
);
alter table public.coupon_progress enable row level security;
create policy "guests see own progress" on public.coupon_progress for select using (user_id = auth.uid());
create policy "staff manage progress" on public.coupon_progress for all using (public.is_staff()) with check (public.is_staff());

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id text not null references public.coupons (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null unique,
  status text not null default 'issued' check (status in ('issued', 'redeemed')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users (id)
);
create index on public.coupon_redemptions (user_id, coupon_id);
alter table public.coupon_redemptions enable row level security;
create policy "guests see own redemptions" on public.coupon_redemptions for select using (user_id = auth.uid() or public.is_staff());

-- Issues (or re-shows) a short-lived code. Single-use coupons can't be issued after a redemption.
create or replace function public.issue_redemption_code(p_coupon_id text, p_ttl_minutes int default 10)
returns table (code text, issued_at timestamptz, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_coupon public.coupons;
  v_existing public.coupon_redemptions;
  v_code text;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then raise exception 'Sign-in required'; end if;

  select * into v_coupon from public.coupons c
  where c.id = p_coupon_id and c.active and c.expires_on >= current_date;
  if not found then raise exception 'Coupon not available.'; end if;

  if v_coupon.tracker_goal is not null and coalesce(
    (select cp.current from public.coupon_progress cp where cp.user_id = auth.uid() and cp.coupon_id = p_coupon_id), 0
  ) < v_coupon.tracker_goal then
    raise exception 'Keep going - this reward is not unlocked yet.';
  end if;

  if v_coupon.single_use and exists (
    select 1 from public.coupon_redemptions r
    where r.user_id = auth.uid() and r.coupon_id = p_coupon_id and r.status = 'redeemed'
  ) then
    raise exception 'This coupon has already been used.';
  end if;

  select * into v_existing from public.coupon_redemptions r
  where r.user_id = auth.uid() and r.coupon_id = p_coupon_id and r.status = 'issued' and r.expires_at > now()
  order by r.issued_at desc limit 1;
  if found then
    return query select v_existing.code, v_existing.issued_at, v_existing.expires_at;
    return;
  end if;

  loop
    v_code := 'GO-' || (
      select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1), '')
      from generate_series(1, 6)
    );
    exit when not exists (select 1 from public.coupon_redemptions r where r.code = v_code);
  end loop;

  return query
  insert into public.coupon_redemptions (coupon_id, user_id, code, expires_at)
  values (p_coupon_id, auth.uid(), v_code, now() + make_interval(mins => p_ttl_minutes))
  returning coupon_redemptions.code, coupon_redemptions.issued_at, coupon_redemptions.expires_at;
end;
$$;
grant execute on function public.issue_redemption_code(text, int) to authenticated;

-- Staff scan the QR (or type the code) and confirm. Returns the coupon so they know which Toast
-- discount to apply.
create or replace function public.redeem_code(p_code text)
returns table (coupon_id text, title text, toast_discount_guid text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_row public.coupon_redemptions;
begin
  if not public.is_staff() then raise exception 'Staff only.'; end if;

  update public.coupon_redemptions r
  set status = 'redeemed', redeemed_at = now(), redeemed_by = auth.uid()
  where r.code = upper(trim(p_code)) and r.status = 'issued' and r.expires_at > now()
  returning * into v_row;
  if not found then raise exception 'Code is invalid, expired, or already used.'; end if;

  return query select c.id, c.title, c.toast_discount_guid from public.coupons c where c.id = v_row.coupon_id;
end;
$$;
grant execute on function public.redeem_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Push tokens
-- ---------------------------------------------------------------------------
create table public.push_tokens (
  token text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  platform text not null,
  updated_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
create policy "guests manage own tokens" on public.push_tokens for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Realtime: live poll percentages
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.poll_options;
