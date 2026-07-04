-- 営業の成果記録 + 拠点・スタッフ名簿
-- Supabase ダッシュボード → SQL Editor でこのファイル全体を実行してください

-- 訪問の成果 (greeting=挨拶・情報提供 / consult=相談あり / new_client=新規獲得 / other=その他)
alter table visits add column outcome text not null default 'greeting'
  check (outcome in ('greeting','consult','new_client','other'));

-- 拠点・スタッフの名簿 (訪問記録の選択式入力に使用)
create table staff (
  id uuid primary key default gen_random_uuid(),
  station text not null,
  name text not null,
  created_at timestamptz not null default now()
);
alter table staff enable row level security;
create policy "team read staff" on staff for select to authenticated using (true);
create policy "team write staff" on staff for insert to authenticated with check (true);
create policy "team delete staff" on staff for delete to authenticated using (true);
