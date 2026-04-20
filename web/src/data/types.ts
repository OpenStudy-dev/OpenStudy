/** User-defined course code — uppercase alphanumeric, 1–8 chars (e.g. "ASB", "CS101"). */
export type CourseCode = string;

export type AppSettings = {
  display_name: string | null;
  monogram: string | null;
  institution: string | null;
  semester_label: string | null;
  semester_start: string | null; // ISO date
  semester_end: string | null;
  timezone: string;
  locale: string;
};

export type StatusKind = string;

export type Course = {
  code: CourseCode;
  full_name: string;
  short_name?: string | null;
  module_code?: string | null;
  ects?: number | null;
  prof?: string | null;
  status_kind?: StatusKind | null;
  language?: string | null;
  color_hex?: string | null;
  folder_name?: string | null;
  exam_weight?: number;
  exam_retries?: number | null;
  notes?: string | null;
};

export type SlotKind = "lecture" | "exercise" | "tutorial" | "lab";

export type Slot = {
  id: string;
  course_code: CourseCode;
  kind: SlotKind;
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; // ISO (1=Mon)
  start_time: string; // "HH:MM"
  end_time: string;
  room: string;
  person?: string;
  starts_on?: string; // ISO date
  ends_on?: string;
  notes?: string;
};

export type ExamStatus = "planned" | "confirmed" | "done";

export type Exam = {
  course_code: CourseCode;
  scheduled_at: string | null; // ISO datetime
  duration_min: number | null;
  location: string | null;
  structure: string | null;
  aids_allowed: string | null;
  status: ExamStatus;
  weight_pct: number;
  notes?: string;
};

export type StudyTopicStatus =
  | "not_started"
  | "in_progress"
  | "studied"
  | "mastered"
  | "struggling";

export type StudyTopicKind = "lecture" | "exercise" | "reading";

export type StudyTopic = {
  id: string;
  course_code: CourseCode;
  chapter?: string;
  name: string;
  description?: string;
  kind?: StudyTopicKind;
  covered_on?: string; // ISO date
  lecture_id?: string;
  status: StudyTopicStatus;
  confidence?: number; // 0..5
  last_reviewed_at?: string;
  notes?: string;
  sort_order?: number;
};

export type DeliverableKind = "submission" | "project" | "lab" | "block";

export type DeliverableStatus =
  | "open"
  | "in_progress"
  | "submitted"
  | "graded"
  | "skipped";

export type Deliverable = {
  id: string;
  course_code: CourseCode;
  kind: DeliverableKind;
  name: string;
  available_at?: string;
  due_at: string;
  status: DeliverableStatus;
  local_path?: string;
  external_url?: string;
  weight_info?: string;
  notes?: string;
};

export type TaskStatus = "open" | "in_progress" | "done" | "skipped" | "blocked";
export type TaskPriority = "low" | "med" | "high" | "urgent";

export type Task = {
  id: string;
  course_code?: CourseCode;
  title: string;
  description?: string;
  due_at?: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags?: string[];
  completed_at?: string;
};

export type Lecture = {
  id: string;
  course_code: CourseCode;
  number?: number;
  held_on?: string;
  kind?: SlotKind;
  title?: string;
  summary?: string;
  attended: boolean;
  notes?: string;
};
