-- 対応してくれた方の名前 (ケアマネ名など) を訪問記録に追加
alter table visits add column met_person text not null default '';
