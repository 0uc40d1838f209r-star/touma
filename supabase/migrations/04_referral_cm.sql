-- 紹介実績 (拠点ごとの累計紹介件数) とケアマネ人数を施設に追加
alter table facilities add column referrals jsonb not null default '{}'::jsonb;
alter table facilities add column care_manager_count integer not null default 0;
