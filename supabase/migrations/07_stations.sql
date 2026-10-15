-- 拠点(店舗)を名簿メンバーと独立して登録できるようにする
create table if not exists stations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
alter table stations enable row level security;
create policy "team read stations" on stations for select to authenticated using (true);
create policy "team write stations" on stations for insert to authenticated with check (true);
create policy "team delete stations" on stations for delete to authenticated using (true);

-- 対応してくれた方の名前 (05 が未実行の環境向けに同梱)
alter table visits add column if not exists met_person text not null default '';
