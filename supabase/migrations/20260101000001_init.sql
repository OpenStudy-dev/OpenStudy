-- OpenStudy schema v1
-- Single-user app. We use the service_role key server-side, so RLS is
-- defense-in-depth rather than the primary authz mechanism.

-- ---------- Courses ----------
create table if not exists courses (
  code              text primary key,
  full_name         text not null,
  short_name        text,
  module_code       text,
  ects              int,
  prof              text,
  status_kind       text,
  language          text,
  color_hex         text,
  folder_name       text,
  klausur_weight    int default 100,
  klausur_retries   int,
  notes             text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ---------- Schedule slots ----------
create table if not exists schedule_slots (
  id           uuid primary key default gen_random_uuid(),
  course_code  text references courses(code) on delete cascade,
  kind         text not null,
  weekday      int not null check (weekday between 1 and 7),
  start_time   time not null,
  end_time     time not null,
  room         text,
  person       text,
  starts_on    date,
  ends_on      date,
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists idx_schedule_slots_course on schedule_slots(course_code);

-- ---------- Klausuren ----------
create table if not exists klausuren (
  course_code   text primary key references courses(code) on delete cascade,
  scheduled_at  timestamptz,
  duration_min  int,
  location      text,
  structure     text,
  aids_allowed  text,
  status        text default 'planned',
  weight_pct    int default 100,
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ---------- Study topics ----------
create table if not exists study_topics (
  id                uuid primary key default gen_random_uuid(),
  course_code       text references courses(code) on delete cascade,
  chapter           text,
  name              text not null,
  kind              text,
  covered_on        date,
  status            text default 'not_started',
  confidence        int check (confidence between 0 and 5),
  last_reviewed_at  timestamptz,
  notes             text,
  sort_order        int default 0,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
create index if not exists idx_study_topics_course on study_topics(course_code);
create index if not exists idx_study_topics_status on study_topics(status);

-- ---------- Deliverables ----------
create table if not exists deliverables (
  id            uuid primary key default gen_random_uuid(),
  course_code   text references courses(code) on delete cascade,
  kind          text,
  name          text not null,
  available_at  timestamptz,
  due_at        timestamptz not null,
  status        text default 'open',
  local_path    text,
  external_url  text,
  weight_info   text,
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists idx_deliverables_course on deliverables(course_code);
create index if not exists idx_deliverables_due on deliverables(due_at);

-- ---------- Tasks ----------
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  course_code  text references courses(code) on delete set null,
  title        text not null,
  description  text,
  due_at       timestamptz,
  status       text default 'open',
  priority     text default 'med',
  tags         text[],
  completed_at timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_due on tasks(due_at);

-- ---------- Events (activity log) ----------
create table if not exists events (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null,
  course_code  text references courses(code) on delete set null,
  payload      jsonb,
  created_at   timestamptz default now()
);
create index if not exists idx_events_created on events(created_at desc);

-- ---------- Login attempts (rate-limit) ----------
create table if not exists login_attempts (
  id          bigserial primary key,
  ip          text not null,
  ok          boolean not null,
  user_agent  text,
  at          timestamptz default now()
);
create index if not exists idx_login_attempts_ip_at on login_attempts(ip, at desc);

-- ---------- updated_at triggers ----------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

do $$ declare t text; begin
  for t in select unnest(array[
    'courses','schedule_slots','klausuren','study_topics','deliverables','tasks'
  ]) loop
    execute format('drop trigger if exists trg_updated_at on %I', t);
    execute format(
      'create trigger trg_updated_at before update on %I for each row execute function set_updated_at()',
      t
    );
  end loop;
end $$;

-- ---------- RLS (defense-in-depth) ----------
alter table courses          enable row level security;
alter table schedule_slots   enable row level security;
alter table klausuren        enable row level security;
alter table study_topics     enable row level security;
alter table deliverables     enable row level security;
alter table tasks            enable row level security;
alter table events           enable row level security;
alter table login_attempts   enable row level security;

-- No policies = anon/authenticated locked out entirely.
-- service_role bypasses RLS, which is what we use from FastAPI.
