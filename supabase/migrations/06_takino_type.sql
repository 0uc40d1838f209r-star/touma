-- 小規模多機能型・看護小規模多機能型 (takino) を施設種別に追加
alter table facilities drop constraint facilities_type_check;
alter table facilities add constraint facilities_type_check
  check (type in ('kyotaku', 'takino', 'hospital', 'clinic', 'other'));
