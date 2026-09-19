-- CoParent — Supabase schema (Phase 2).
-- Run this in the Supabase SQL editor after creating your project.
-- Everything is scoped to a "family" so two co-parents share one dataset, with
-- Row-Level Security so a user can only see their own family's rows. The private
-- journal is the exception: only its author can read it.

-- ── Families & membership ─────────────────────────────────────────────────
create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid references families (id) on delete set null,
  name text not null default '',
  role text not null default 'coparent',
  created_at timestamptz not null default now()
);

-- True when the current user belongs to the given family.
create or replace function is_family_member(fam uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from profiles p where p.id = auth.uid() and p.family_id = fam
  );
$$;

-- ── Shared records ────────────────────────────────────────────────────────
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families (id) on delete cascade,
  from_id uuid not null references auth.users (id),
  body text not null,
  tone text not null default 'calm',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families (id) on delete cascade,
  title text not null,
  category text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  notes text,
  with_id uuid,
  request_status text not null default 'none',
  requested_by uuid
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families (id) on delete cascade,
  description text not null,
  amount numeric(10,2) not null,
  paid_by uuid not null,
  split_other_share numeric(4,3) not null default 0.5,
  date date not null default now(),
  category text not null default 'Other',
  status text not null default 'open',
  receipt_path text
);

create table if not exists info_records (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families (id) on delete cascade,
  child_id uuid,
  kind text not null,
  label text not null,
  value text not null
);

create table if not exists packing_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families (id) on delete cascade,
  label text not null,
  packed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Private to the author.
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null,
  mood text,
  created_at timestamptz not null default now()
);

-- ── Row-Level Security ────────────────────────────────────────────────────
alter table profiles        enable row level security;
alter table messages        enable row level security;
alter table events          enable row level security;
alter table expenses        enable row level security;
alter table info_records    enable row level security;
alter table packing_items   enable row level security;
alter table journal_entries enable row level security;

create policy "own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- One reusable pattern per shared table: family members get full access.
do $$
declare t text;
begin
  foreach t in array array['messages','events','expenses','info_records','packing_items']
  loop
    execute format($f$
      create policy "family read"  on %1$I for select using (is_family_member(family_id));
      create policy "family write" on %1$I for insert with check (is_family_member(family_id));
      create policy "family modify" on %1$I for update using (is_family_member(family_id));
      create policy "family delete" on %1$I for delete using (is_family_member(family_id));
    $f$, t);
  end loop;
end $$;

create policy "own journal" on journal_entries
  for all using (author_id = auth.uid()) with check (author_id = auth.uid());

-- Storage bucket for receipts / attachments (create in the dashboard or here):
-- insert into storage.buckets (id, name, public) values ('attachments','attachments',false);
