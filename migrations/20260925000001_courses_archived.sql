-- Courses from finished semesters are archived, not deleted: the dashboard
-- hides them (and their slots, exams, deliverables, tasks, topics, lectures)
-- while their history and files stay available.
BEGIN;

ALTER TABLE public.courses ADD COLUMN archived boolean NOT NULL DEFAULT false;

COMMIT;
