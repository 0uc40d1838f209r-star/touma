-- 営業先マップ用スキーマ
-- Supabase ダッシュボード → SQL Editor にこのファイルの内容を貼り付けて Run してください。

create table facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'other' check (type in ('kyotaku', 'hospital', 'clinic', 'other')),
  address text not null default '',
  lat double precision not null,
  lng double precision not null,
  phone text not null default '',
  status text not null default 'not_visited' check (status in ('not_visited', 'visited', 'regular', 'referral')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities (id) on delete cascade,
  name text not null,
  role text not null default '',
  phone text not null default '',
  note text not null default ''
);

create table visits (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities (id) on delete cascade,
  visited_on date not null,
  staff_name text not null default '',
  memo text not null default '',
  created_at timestamptz not null default now()
);

-- RLS: ログイン済みユーザー(=チームメンバー)全員が読み書き可能
alter table facilities enable row level security;
alter table contacts enable row level security;
alter table visits enable row level security;

create policy "team can read facilities" on facilities for select to authenticated using (true);
create policy "team can write facilities" on facilities for insert to authenticated with check (true);
create policy "team can update facilities" on facilities for update to authenticated using (true);
create policy "team can delete facilities" on facilities for delete to authenticated using (true);

create policy "team can read contacts" on contacts for select to authenticated using (true);
create policy "team can write contacts" on contacts for insert to authenticated with check (true);
create policy "team can update contacts" on contacts for update to authenticated using (true);
create policy "team can delete contacts" on contacts for delete to authenticated using (true);

create policy "team can read visits" on visits for select to authenticated using (true);
create policy "team can write visits" on visits for insert to authenticated with check (true);
create policy "team can update visits" on visits for update to authenticated using (true);
create policy "team can delete visits" on visits for delete to authenticated using (true);
