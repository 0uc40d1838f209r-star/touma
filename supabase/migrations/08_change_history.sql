-- 記録が消えないように: 上書き・削除の直前の内容を自動で保管する
create table if not exists change_history (
  id bigserial primary key,
  table_name text not null,
  row_id uuid not null,
  action text not null,          -- 'UPDATE' | 'DELETE'
  old_data jsonb not null,       -- 変更前の行の中身
  changed_at timestamptz not null default now()
);
create index if not exists change_history_row_idx on change_history (table_name, row_id);
create index if not exists change_history_fac_idx on change_history ((old_data->>'facility_id'));
alter table change_history enable row level security;
drop policy if exists "team read history" on change_history;
create policy "team read history" on change_history for select to authenticated using (true);

create or replace function log_row_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into change_history (table_name, row_id, action, old_data)
  values (tg_table_name, old.id, tg_op, to_jsonb(old));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists visits_history on visits;
create trigger visits_history before update or delete on visits
  for each row execute function log_row_change();
drop trigger if exists facilities_history on facilities;
create trigger facilities_history before delete on facilities
  for each row execute function log_row_change();
drop trigger if exists contacts_history on contacts;
create trigger contacts_history before update or delete on contacts
  for each row execute function log_row_change();
