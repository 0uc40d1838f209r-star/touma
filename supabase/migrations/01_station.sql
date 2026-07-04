-- 訪問記録に拠点名を追加
-- Supabase ダッシュボード → SQL Editor でこの 1 行を実行してください
alter table visits add column station_name text not null default '';
