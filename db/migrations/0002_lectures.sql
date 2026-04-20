-- Lectures: actual instances of a VL/Übung/Tutorium/Praktikum held on a
-- specific date. Study topics can be linked back to the lecture they were
-- covered in via `study_topics.lecture_id`.

create table if not exists lectures (
  id           uuid primary key default gen_random_uuid(),
  course_code  text not null references courses(code) on delete cascade,
  number       int,
  held_on      date not null,
  kind         text not null default 'Vorlesung',
  title        text,
  summary      text,
  attended     boolean default false,
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (course_code, number)
);
create index if not exists idx_lectures_course on lectures(course_code);
create index if not exists idx_lectures_held on lectures(held_on desc);

-- Study topic gains a richer description field and a back-reference to
-- the lecture it was introduced in (nullable — some topics exist as
-- reading assignments not tied to a specific VL).
alter table study_topics
  add column if not exists description text,
  add column if not exists lecture_id  uuid references lectures(id) on delete set null;

create index if not exists idx_study_topics_lecture on study_topics(lecture_id);

-- Ensure the updated_at trigger also fires on lectures.
drop trigger if exists trg_updated_at on lectures;
create trigger trg_updated_at
  before update on lectures
  for each row
  execute function set_updated_at();

alter table lectures enable row level security;
