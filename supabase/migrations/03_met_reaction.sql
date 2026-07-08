-- 訪問記録に「面談相手」と「先方の反応」を追加
-- Supabase ダッシュボード → SQL Editor でこの 2 行を実行してください
alter table visits add column met text not null default '';
alter table visits add column reaction text not null default '';
