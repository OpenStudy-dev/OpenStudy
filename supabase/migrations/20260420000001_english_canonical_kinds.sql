-- Migration 0005: English canonical names
-- - Slot / lecture kinds: Vorlesung|Übung|Tutorium|Praktikum → lecture|exercise|tutorial|lab
-- - Study topic kinds:    vorlesung|uebung             → lecture|exercise  (reading unchanged)
-- - Deliverable kinds:    abgabe|praktikum             → submission|lab    (project/block unchanged)
-- - Course fields:        klausur_weight, klausur_retries → exam_weight, exam_retries
-- - Table rename:         klausuren → exams
--
-- Safe to re-run: guarded by WHERE clauses on source values and column-existence checks.

begin;

-- ─── schedule_slots.kind ───────────────────────────────────────────────
update schedule_slots set kind = 'lecture'  where kind = 'Vorlesung';
update schedule_slots set kind = 'exercise' where kind = 'Übung';
update schedule_slots set kind = 'tutorial' where kind = 'Tutorium';
update schedule_slots set kind = 'lab'      where kind = 'Praktikum';

-- ─── lectures.kind ─────────────────────────────────────────────────────
update lectures set kind = 'lecture'  where kind = 'Vorlesung';
update lectures set kind = 'exercise' where kind = 'Übung';
update lectures set kind = 'tutorial' where kind = 'Tutorium';
update lectures set kind = 'lab'      where kind = 'Praktikum';
alter table lectures alter column kind set default 'lecture';

-- ─── study_topics.kind ─────────────────────────────────────────────────
update study_topics set kind = 'lecture'  where kind = 'vorlesung';
update study_topics set kind = 'exercise' where kind = 'uebung';

-- ─── deliverables.kind ─────────────────────────────────────────────────
update deliverables set kind = 'submission' where kind = 'abgabe';
update deliverables set kind = 'lab'        where kind = 'praktikum';

-- ─── courses: klausur_* → exam_* ───────────────────────────────────────
alter table courses rename column klausur_weight  to exam_weight;
alter table courses rename column klausur_retries to exam_retries;

-- ─── Rename klausuren → exams ──────────────────────────────────────────
alter table klausuren rename to exams;

commit;
