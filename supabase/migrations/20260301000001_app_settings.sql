-- App settings: a single-row table holding profile + semester config.
-- Single-user-per-deploy model — we enforce a single row via PK = 1.
create table if not exists app_settings (
  id               smallint primary key default 1,
  display_name     text,
  monogram         text,
  institution      text,
  semester_label   text,
  semester_start   date,
  semester_end     date,
  timezone         text default 'UTC',
  locale           text default 'en-US',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  constraint app_settings_singleton check (id = 1)
);

-- Seed the singleton row if missing.
insert into app_settings (id) values (1) on conflict (id) do nothing;
