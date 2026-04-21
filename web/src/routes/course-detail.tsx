import { useState } from "react";
import { useParams, Link, Navigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Calendar,
  Users,
  GraduationCap,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Check,
  Plus,
  Pencil,
  RotateCcw,
  MoreHorizontal,
  Trash2,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { CourseAccentBar, CourseDot } from "@/components/common/course-accent";
import { StatusChip } from "@/components/common/status-chip";
import { CountdownChip } from "@/components/common/countdown-chip";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input, Textarea, Field } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import { CourseForm } from "@/components/forms/course-form";
import { StudyTopicForm } from "@/components/forms/study-topic-form";
import { TaskForm } from "@/components/forms/task-form";
import { DeliverableForm } from "@/components/forms/deliverable-form";
import { LectureForm } from "@/components/forms/lecture-form";
import { SlotForm } from "@/components/forms/slot-form";
import { FileBrowser } from "@/components/files/file-browser";
import {
  useCompleteTask,
  useDashboard,
  useDeleteLecture,
  useMarkDeliverableSubmitted,
  useMarkStudied,
  useReopenDeliverable,
  useReopenTask,
  useToggleLectureAttended,
  useUpdateCourse,
  useUpdateExam,
  useUpdateStudyTopic,
} from "@/lib/queries";
import type {
  Course,
  CourseCode,
  Deliverable,
  Exam,
  Lecture,
  Slot,
  StudyTopic,
  Task,
} from "@/data/types";
import { fmtBerlin, fmtDate, fmtDateShort, fmtDateTime, relative, weekdayLabels } from "@/lib/time";
import { displayStatus } from "@/lib/topic-status";
import { cn } from "@/lib/cn";

type Tab = "overview" | "schedule" | "lectures" | "study" | "deliverables" | "tasks" | "files";

export default function CourseDetail() {
  const { t } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const normalized = (code ?? "").toUpperCase() as CourseCode;
  const { data, isPending, error } = useDashboard();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const fromUrl = searchParams.get("tab");
    const valid: Tab[] = ["overview", "schedule", "lectures", "study", "deliverables", "tasks", "files"];
    return fromUrl && (valid as string[]).includes(fromUrl) ? (fromUrl as Tab) : "overview";
  });

  if (isPending) {
    return (
      <>
        <Header title="Course" />
        <div className="px-4 py-12 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        </div>
      </>
    );
  }
  if (error || !data) {
    return (
      <>
        <Header title="Course" />
        <div className="px-4 py-12 text-center text-sm text-critical">
          Couldn't load course.
        </div>
      </>
    );
  }

  const course = data.courses.find((c) => c.code === normalized);
  if (!course) return <Navigate to="/courses" replace />;

  const c = course.code as CourseCode;
  const courseSlots = data.slots.filter((s) => s.course_code === c);
  const courseDeliverables = data.deliverables.filter((d) => d.course_code === c);
  const courseTopics = data.study_topics.filter((t) => t.course_code === c);
  const courseLectures = data.lectures.filter((l) => l.course_code === c);
  const exam = data.exams.find((k) => k.course_code === c);
  const courseTasks = data.tasks.filter((t) => t.course_code === c);
  const fb = data.fall_behind.find((f) => f.course_code === c);

  const progress = (() => {
    const weights: Record<string, number> = {
      not_started: 0,
      struggling: 0.2,
      in_progress: 0.5,
      studied: 0.9,
      mastered: 1,
    };
    // Exclude "upcoming" (no covered_on) from progress denominator
    const active = courseTopics.filter(
      (t) => displayStatus(t) !== "upcoming"
    );
    if (active.length === 0) return 0;
    const total = active.reduce((s, t) => s + (weights[t.status] ?? 0), 0);
    return Math.round((total / active.length) * 100);
  })();

  const nextLecture = fb?.next_lecture_at ? new Date(fb.next_lecture_at) : null;

  return (
    <>
      <Header title={course.code} subtitle={course.full_name} />

      <div className="px-4 md:px-8 pt-4 max-w-[1200px] mx-auto w-full">
        <Link
          to="/courses"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All courses
        </Link>
      </div>

      <div className="px-4 md:px-8 py-4 md:py-6 flex flex-col gap-6 max-w-[1200px] mx-auto w-full">
        <CourseHeader
          course={course}
          progress={progress}
          fb={fb}
          nextLecture={nextLecture}
          exam={exam}
        />

        <section>
          <div className="border-b border-border/60 overflow-x-auto">
            <div className="flex min-w-max">
              {([
                ["overview", t("courseDetail.tab.overview")],
                ["schedule", t("courseDetail.tab.schedule")],
                ["lectures", t("courseDetail.tab.lectures")],
                ["study", t("courseDetail.tab.studyTopics")],
                ["deliverables", t("courseDetail.tab.deliverables")],
                ["tasks", t("courseDetail.tab.tasks")],
                ["files", t("courseDetail.tab.files")],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium touch-target border-b-2 transition-colors",
                    tab === key
                      ? "border-fg text-fg"
                      : "border-transparent text-muted hover:text-fg"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-5">
            {tab === "overview" && (
              <OverviewTab
                code={c}
                course={course}
                exam={exam}
                deliverables={courseDeliverables}
                topics={courseTopics}
              />
            )}
            {tab === "schedule" && <ScheduleTab slots={courseSlots} courseCode={c} />}
            {tab === "lectures" && (
              <LecturesTab courseCode={c} lectures={courseLectures} topics={courseTopics} />
            )}
            {tab === "study" && (
              <StudyTab topics={courseTopics} courseCode={c} lectures={courseLectures} />
            )}
            {tab === "deliverables" && (
              <DeliverablesTab deliverables={courseDeliverables} courseCode={c} courses={data.courses} />
            )}
            {tab === "tasks" && (
              <TasksTab tasks={courseTasks} courses={data.courses} defaultCourse={c} />
            )}
            {tab === "files" && (
              <FileBrowser
                rootPrefix={course.folder_name || c}
                rootLabel={course.folder_name || c}
              />
            )}
          </div>
        </section>
      </div>
    </>
  );
}

// ───────── Course header with edit notes + exam ─────────

function CourseHeader({
  course,
  progress,
  fb,
  nextLecture,
  exam,
}: {
  course: Course;
  progress: number;
  fb?: ReturnType<typeof useDashboard>["data"] extends infer T
    ? T extends { fall_behind: infer F }
      ? F extends Array<infer I>
        ? I
        : never
      : never
    : never;
  nextLecture: Date | null;
  exam?: Exam;
}) {
  const c = course.code as CourseCode;
  const [editing, setEditing] = useState(false);

  return (
    <section className="card overflow-hidden relative">
      <CourseAccentBar code={c} />
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Edit course"
        className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-fg px-2 py-1 rounded-md hover:bg-surface-2 transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" /> Edit
      </button>
      <div className="p-4 md:p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3 pr-16">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted font-mono">
              <span>{course.module_code}</span>
              <span>·</span>
              <span>{course.ects} LP</span>
              <span>·</span>
              <span>{course.status_kind}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-semibold mt-1">{course.full_name}</h2>
            <p className="text-sm text-muted mt-1">
              <Users className="inline h-3.5 w-3.5 mr-1" />
              {course.prof} · {course.language}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1 text-sm">
            {nextLecture && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted" />
                <span className="text-muted">Next lecture</span>
                <CountdownChip target={nextLecture} />
              </div>
            )}
            {exam?.scheduled_at && (
              <div className="flex items-center gap-2">
                <GraduationCap className="h-3.5 w-3.5 text-muted" />
                <span className="text-muted">Exam</span>
                <CountdownChip target={exam.scheduled_at} />
              </div>
            )}
          </div>
        </div>

        <CourseForm open={editing} onOpenChange={setEditing} course={course} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted">Study progress</span>
              <span className="font-mono tabular-nums">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  fb && (fb as { severity: string }).severity !== "ok" ? "bg-warn/70" : "bg-ok/80"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          {fb && (fb as { severity: string }).severity !== "ok" && (
            <FallBehindInline fb={fb as never} />
          )}
        </div>
      </div>
    </section>
  );
}

function FallBehindInline({
  fb,
}: {
  fb: { severity: "warn" | "critical"; topics: StudyTopic[]; last_covered_on: string | null; next_lecture_at: string | null };
}) {
  const { t } = useTranslation();
  const since = fb.last_covered_on
    ? fmtDateShort(fb.last_covered_on)
    : t("courseDetail.fallBehind.sinceEarlier");
  return (
    <div
      className={cn(
        "flex items-start gap-2 text-sm",
        fb.severity === "critical" ? "text-critical" : "text-warn"
      )}
    >
      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-medium">{t("courseDetail.fallBehind.title")}</p>
        <p className="text-xs opacity-90">
          {t("courseDetail.fallBehind.body", { count: fb.topics.length, since })}
          {fb.next_lecture_at && " " + t("courseDetail.fallBehind.nextLecture", { rel: relative(fb.next_lecture_at).label })}
        </p>
      </div>
    </div>
  );
}

function CourseNotesForm({
  open,
  onOpenChange,
  course,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course;
}) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState(course.notes ?? "");
  const update = useUpdateCourse();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={t("forms.courseNotes.title", { code: course.code })}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await update.mutateAsync({ code: course.code, patch: { notes: notes.trim() || undefined } });
              toast.success(t("courseDetail.notesSaved"));
              onOpenChange(false);
            } catch (e) {
              toast.error((e as Error).message || t("common.failed"));
            }
          }}
          className="flex flex-col gap-4"
        >
          <Field label={t("forms.courseNotes.notes")}>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={8}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ExamForm({
  open,
  onOpenChange,
  exam,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam: Exam;
}) {
  const { t } = useTranslation();
  const update = useUpdateExam();
  const [scheduledAt, setScheduledAt] = useState(
    exam.scheduled_at ? exam.scheduled_at.slice(0, 16) : ""
  );
  const [durationMin, setDurationMin] = useState(String(exam.duration_min ?? ""));
  const [location, setLocation] = useState(exam.location ?? "");
  const [structure, setStructure] = useState(exam.structure ?? "");
  const [aidsAllowed, setAidsAllowed] = useState(exam.aids_allowed ?? "");
  const [status, setStatus] = useState(exam.status);
  const [notes, setNotes] = useState(exam.notes ?? "");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={t("forms.exam.title", { code: exam.course_code })}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await update.mutateAsync({
                code: exam.course_code,
                patch: {
                  scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
                  duration_min: durationMin ? Number(durationMin) : undefined,
                  location: location.trim() || undefined,
                  structure: structure.trim() || undefined,
                  aids_allowed: aidsAllowed.trim() || undefined,
                  status,
                  notes: notes.trim() || undefined,
                },
              });
              toast.success(t("courseDetail.examSaved"));
              onOpenChange(false);
            } catch (e) {
              toast.error((e as Error).message || t("common.failed"));
            }
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("forms.exam.scheduled")}>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </Field>
            <Field label={t("forms.exam.duration")}>
              <Input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
              />
            </Field>
          </div>
          <Field label={t("forms.exam.location")}>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </Field>
          <Field label={t("forms.exam.structure")}>
            <Input value={structure} onChange={(e) => setStructure(e.target.value)} />
          </Field>
          <Field label={t("forms.exam.aids")}>
            <Input value={aidsAllowed} onChange={(e) => setAidsAllowed(e.target.value)} />
          </Field>
          <Field label={t("forms.exam.status")}>
            <Select value={status} onValueChange={(v) => setStatus(v as Exam["status"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">{t("forms.exam.statusPlanned")}</SelectItem>
                <SelectItem value="confirmed">{t("forms.exam.statusConfirmed")}</SelectItem>
                <SelectItem value="done">{t("forms.exam.statusDone")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("forms.exam.notes")}>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ───────── Overview tab ─────────

function OverviewTab({
  code,
  course,
  exam,
  deliverables,
  topics,
}: {
  code: CourseCode;
  course: Course;
  exam?: Exam;
  deliverables: Deliverable[];
  topics: StudyTopic[];
}) {
  const openDels = deliverables.filter((d) => d.status === "open" || d.status === "in_progress");
  const activeTopics = topics.filter((t) => displayStatus(t) !== "upcoming");
  const openTopics = activeTopics.filter((t) => t.status === "not_started" || t.status === "in_progress");
  const [notesEditing, setNotesEditing] = useState(false);
  const [examEditing, setExamEditing] = useState(false);
  const notes = course.notes ?? undefined;
  const { t } = useTranslation();
  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card pt-2 px-4 pb-4 md:pt-2.5 md:px-5 md:pb-5">
        <div className="flex items-center justify-between mb-2 gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("courseDetail.overview.notes")}</h3>
          <Button variant="ghost" size="sm" onClick={() => setNotesEditing(true)}>
            <Pencil className="h-3.5 w-3.5" /> {t("common.edit")}
          </Button>
        </div>
        <p className="text-sm text-fg whitespace-pre-wrap">{notes ?? "—"}</p>
      </div>
      <div className="card pt-2 px-4 pb-4 md:pt-2.5 md:px-5 md:pb-5">
        <div className="flex items-center justify-between mb-2 gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("courseDetail.overview.exam")}</h3>
          {exam && (
            <Button variant="ghost" size="sm" onClick={() => setExamEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />{" "}
              {exam.scheduled_at ? t("common.edit") : t("courseDetail.setExamDate")}
            </Button>
          )}
        </div>
        {exam ? (
          <dl className="text-sm grid grid-cols-3 gap-y-1.5">
            <dt className="text-muted col-span-1">{t("courseDetail.overview.status")}</dt>
            <dd className="col-span-2">
              <StatusChip status={exam.status} />
            </dd>
            <dt className="text-muted col-span-1">{t("courseDetail.overview.examDate")}</dt>
            <dd className="col-span-2">
              {exam.scheduled_at ? fmtDateTime(exam.scheduled_at) : t("courseDetail.overview.tbd")}
            </dd>
            <dt className="text-muted col-span-1">{t("courseDetail.overview.duration")}</dt>
            <dd className="col-span-2">
              {exam.duration_min ? t("courseDetail.overview.minutes", { n: exam.duration_min }) : t("courseDetail.overview.tbd")}
            </dd>
            <dt className="text-muted col-span-1">{t("courseDetail.overview.structure")}</dt>
            <dd className="col-span-2">{exam.structure ?? t("courseDetail.overview.tbd")}</dd>
            <dt className="text-muted col-span-1">{t("courseDetail.overview.aids")}</dt>
            <dd className="col-span-2">{exam.aids_allowed ?? t("courseDetail.overview.tbd")}</dd>
            <dt className="text-muted col-span-1">{t("courseDetail.overview.weight")}</dt>
            <dd className="col-span-2">{exam.weight_pct}%</dd>
          </dl>
        ) : (
          <p className="text-sm text-muted">{t("courseDetail.overview.noExamData")}</p>
        )}
        {exam?.notes && <p className="text-xs text-muted mt-3">{exam.notes}</p>}
      </div>

      <div className="card p-4 md:p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">
          {t("courseDetail.overview.openDeliverables", { n: openDels.length })}
        </h3>
        {openDels.length === 0 ? (
          <p className="text-sm text-muted">{t("courseDetail.overview.nothingOpen")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {openDels.slice(0, 4).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2">
                <span className="text-sm truncate">{d.name}</span>
                <CountdownChip target={d.due_at} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-4 md:p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">
          {t("courseDetail.overview.topicsInProgress", { n: openTopics.length })}
        </h3>
        {openTopics.length === 0 ? (
          <p className="text-sm text-muted">{t("courseDetail.overview.allCaughtUp")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {openTopics.slice(0, 4).map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <CourseDot code={code} />
                <span className="text-sm truncate">{t.name}</span>
                <StatusChip status={t.status} className="ml-auto" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
    <CourseNotesForm open={notesEditing} onOpenChange={setNotesEditing} course={course} />
    {exam && (
      <ExamForm open={examEditing} onOpenChange={setExamEditing} exam={exam} />
    )}
    </>
  );
}

// ───────── Schedule tab ─────────

function ScheduleTab({
  slots,
  courseCode,
}: {
  slots: ReturnType<typeof useDashboard>["data"] extends infer T
    ? T extends { slots: infer S } ? S : never
    : never;
  courseCode: CourseCode;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Slot | null>(null);
  const list = (slots ?? []) as Slot[];

  const sorted = [...list].sort((a, b) =>
    a.weekday === b.weekday
      ? a.start_time.localeCompare(b.start_time)
      : a.weekday - b.weekday
  );

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Weekly slots
        </h3>
        <Button variant="secondary" size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" /> Add slot
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3">
          <EmptyState
            title="No slots"
            description="Add a recurring slot to build out the weekly schedule."
          />
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Add first slot
          </Button>
        </div>
      ) : (
        <div className="card p-4 md:p-5">
          <ul className="divide-y divide-border/50">
            {sorted.map((s) => (
              <li
                key={s.id}
                className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-surface-2/50 -mx-2 px-2 rounded-md transition-colors"
                onClick={() => setEditing(s)}
              >
                <div className="flex items-center gap-3 w-full sm:w-48">
                  <span className="text-xs font-semibold uppercase text-muted w-8">
                    {weekdayLabels[s.weekday - 1]}
                  </span>
                  <span className="text-sm font-medium font-mono tabular-nums">
                    {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    <span className="capitalize">{s.kind}</span>
                    {s.room && <> · {s.room}</>}
                  </p>
                  {s.person && <p className="text-xs text-muted">{s.person}</p>}
                  {s.notes && <p className="text-xs text-subtle mt-0.5">{s.notes}</p>}
                </div>
                {s.starts_on && (
                  <p className="text-xs text-muted">starts {fmtDate(s.starts_on)}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <SlotForm
        open={creating}
        onOpenChange={setCreating}
        courseCode={courseCode}
      />
      <SlotForm
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        slot={editing}
        courseCode={courseCode}
      />
    </>
  );
}

// ───────── Lectures tab ─────────

function LecturesTab({
  courseCode,
  lectures,
  topics,
}: {
  courseCode: CourseCode;
  lectures: Lecture[];
  topics: StudyTopic[];
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Lecture | null>(null);
  const [creating, setCreating] = useState(false);
  const toggle = useToggleLectureAttended();
  const del = useDeleteLecture();

  const sorted = [...lectures].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

  async function onDelete(id: string) {
    if (!confirm(t("forms.lecture.confirmDelete"))) return;
    try {
      await del.mutateAsync(id);
      toast.success(t("forms.lecture.deleted"));
    } catch (e) {
      toast.error((e as Error).message || t("common.failed"));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> {t("forms.lecture.titleAdd")}
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          title={t("courseDetail.lectures.emptyTitle", "No lectures yet")}
          description={t("courseDetail.lectures.emptyBody", "Add a lecture after attending — then link the topics it covered.")}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((l) => {
            const linkedTopics = topics.filter((t) => t.lecture_id === l.id);
            return (
              <div key={l.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() =>
                        toggle.mutate({ id: l.id, attended: !l.attended })
                      }
                      className={cn(
                        "touch-target rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                        l.attended
                          ? "border-ok bg-ok/20 text-ok"
                          : "border-border/60 hover:border-ok hover:bg-ok/10"
                      )}
                      aria-label={l.attended ? t("courseDetail.lectures.unmarkAttended", "Unmark attended") : t("courseDetail.lectures.markAttended", "Mark attended")}
                    >
                      {l.attended ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <BookOpen className="h-4 w-4 text-muted" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        #{l.number ?? "?"} · {l.title || t("courseDetail.lectures.untitled", "Untitled lecture")}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        <span className="capitalize">{l.kind ? t(`kinds.slot.${l.kind}`, l.kind) : "—"}</span>
                        {l.held_on && ` · ${fmtDate(l.held_on)}`}
                        {` · ${linkedTopics.length} ${linkedTopics.length === 1 ? t("common.topic") : t("common.topics")}`}
                      </p>
                      {l.summary && <p className="text-xs text-muted mt-1">{l.summary}</p>}
                    </div>
                  </div>
                  <Dropdown>
                    <DropdownTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="More">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownTrigger>
                    <DropdownContent align="end">
                      <DropdownItem onSelect={() => setEditing(l)}>
                        <Pencil className="h-3.5 w-3.5" /> {t("common.edit")}
                      </DropdownItem>
                      <DropdownSeparator className="my-1 h-px bg-border/50" />
                      <DropdownItem onSelect={() => onDelete(l.id)} danger>
                        <Trash2 className="h-3.5 w-3.5" /> {t("common.delete")}
                      </DropdownItem>
                    </DropdownContent>
                  </Dropdown>
                </div>

                {linkedTopics.length > 0 && (
                  <ul className="mt-3 pl-10 flex flex-col gap-1.5 border-l border-border/50">
                    {linkedTopics.map((t) => (
                      <li key={t.id} className="flex items-center gap-2 text-xs">
                        <span className="text-muted truncate">{t.name}</span>
                        <StatusChip status={displayStatus(t)} className="ml-auto" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      <LectureForm
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        lecture={editing}
        courseCode={courseCode}
      />
    </div>
  );
}

// ───────── Study topics tab ─────────

function StudyTab({
  topics,
  courseCode,
  lectures,
}: {
  topics: StudyTopic[];
  courseCode: CourseCode;
  lectures: Lecture[];
}) {
  const { t: tr } = useTranslation();
  const markStudied = useMarkStudied();
  const [editing, setEditing] = useState<StudyTopic | null>(null);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const grouped = groupByChapter(topics);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> {tr("forms.studyTopic.titleAdd")}
        </Button>
      </div>

      {topics.length === 0 ? (
        <EmptyState
          title={tr("courseDetail.study.emptyTitle", "No topics yet")}
          description={tr("courseDetail.study.emptyBody", "Add topics as you read the Skript or attend lectures.")}
        />
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
          .map(([chapter, list]) => (
          <div key={chapter} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">
                {tr("forms.studyTopic.chapter")} {chapter || "—"}
              </h3>
              <p className="text-xs text-muted">
                {list.length} {list.length === 1 ? tr("common.topic") : tr("common.topics")}
              </p>
            </div>
            <ul className="divide-y divide-border/50">
              {[...list]
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((t) => {
                  const done = t.status === "studied" || t.status === "mastered";
                  const pending =
                    markStudied.isPending && markStudied.variables === t.id;
                  const effective = displayStatus(t);
                  const isExpanded = expanded.has(t.id);
                  return (
                    <li key={t.id} className="py-2">
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          aria-label={done
                            ? tr("courseDetail.study.alreadyStudied", "Already studied")
                            : tr("courseDetail.study.markStudied", { defaultValue: "Mark studied: {{name}}", name: t.name })}
                          disabled={done || pending || effective === "upcoming"}
                          onClick={() => markStudied.mutate(t.id)}
                          className={cn(
                            "touch-target flex items-center justify-center rounded-full border-2 flex-shrink-0 mt-0.5",
                            done
                              ? "border-ok bg-ok/20 text-ok"
                              : effective === "upcoming"
                              ? "border-border/40 opacity-40 cursor-not-allowed"
                              : "border-border/60 hover:border-ok hover:bg-ok/10 transition-colors"
                          )}
                        >
                          {pending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
                          ) : done ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <span className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleExpand(t.id)}
                          className="min-w-0 flex-1 text-left"
                          aria-expanded={isExpanded}
                        >
                          <p className="text-sm font-medium">{t.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                            {t.covered_on && (
                              <span>{tr("courseDetail.study.covered", "covered")} {fmtBerlin(t.covered_on, "d MMM")}</span>
                            )}
                            {!t.covered_on && effective === "upcoming" && (
                              <span>{tr("courseDetail.study.notYetTaught", "not yet taught")}</span>
                            )}
                            {t.confidence !== undefined && t.confidence !== null && (
                              <span className="font-mono">
                                {"●".repeat(t.confidence) + "○".repeat(5 - t.confidence)}
                              </span>
                            )}
                            {t.description && (
                              <span className="text-subtle">
                                {isExpanded ? `▴ ${tr("common.hide", "hide")}` : `▾ ${tr("common.details", "details")}`}
                              </span>
                            )}
                          </div>
                        </button>
                        <StatusChip status={effective} />
                        <button
                          type="button"
                          onClick={() => setEditing(t)}
                          aria-label={tr("common.edit")}
                          className="touch-target inline-flex items-center justify-center rounded-md text-muted hover:text-fg"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {isExpanded && t.description && (
                        <div className="ml-[52px] mt-2 mr-2 rounded-md bg-surface-2 border border-border/50 p-3 text-sm text-fg whitespace-pre-wrap leading-relaxed animate-slide-up">
                          {t.description}
                        </div>
                      )}
                      {isExpanded && t.notes && (
                        <div className="ml-[52px] mt-2 mr-2 rounded-md border border-info/30 bg-info/5 p-3 text-xs text-muted whitespace-pre-wrap">
                          <p className="font-semibold text-info/90 uppercase tracking-wide text-[10px] mb-1">
                            {tr("courseDetail.study.personalNotes", "Personal notes")}
                          </p>
                          {t.notes}
                        </div>
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>
        ))
      )}

      <StudyTopicForm
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        topic={editing}
        courseCode={courseCode}
        lectures={lectures}
      />
    </div>
  );
}

// ───────── Deliverables tab ─────────

function DeliverablesTab({
  deliverables,
  courseCode,
  courses,
}: {
  deliverables: Deliverable[];
  courseCode: CourseCode;
  courses: Course[];
}) {
  const { t } = useTranslation();
  const submit = useMarkDeliverableSubmitted();
  const reopen = useReopenDeliverable();
  const [editing, setEditing] = useState<Deliverable | null>(null);
  const [creating, setCreating] = useState(false);

  async function onSubmit(d: Deliverable) {
    try {
      await submit.mutateAsync(d.id);
      toast.success(t("courseDetail.deliverables.submittedToast", { defaultValue: "Submitted: {{name}}", name: d.name }), {
        action: {
          label: t("common.undo", "Undo"),
          onClick: async () => {
            await reopen.mutateAsync(d.id);
            toast.success(t("courseDetail.deliverables.restored", "Restored"));
          },
        },
      });
    } catch (e) {
      toast.error((e as Error).message || t("common.failed"));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> {t("forms.deliverable.titleAdd")}
        </Button>
      </div>

      {deliverables.length === 0 ? (
        <EmptyState title={t("courseDetail.deliverables.empty", "No deliverables")} />
      ) : (
        <div className="card p-4">
          <ul className="divide-y divide-border/50">
            {[...deliverables]
              .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
              .map((d) => (
                <li key={d.id} className="py-3 flex flex-wrap items-start gap-2 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {t("courseDetail.deliverables.duePrefix", "Due")} {fmtDateTime(d.due_at)}
                      {d.weight_info && ` · ${d.weight_info}`}
                    </p>
                    {d.local_path && (
                      <p className="text-[11px] font-mono text-subtle mt-0.5 truncate">{d.local_path}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusChip status={d.status} />
                    <CountdownChip target={d.due_at} />
                    {d.external_url && (
                      <a
                        href={d.external_url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={t("common.open")}
                        className="touch-target inline-flex items-center justify-center rounded-md text-muted hover:text-fg"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    {(d.status === "open" || d.status === "in_progress") && (
                      <Button variant="secondary" size="sm" onClick={() => onSubmit(d)}>
                        {t("courseDetail.deliverables.submit", "Submit")}
                      </Button>
                    )}
                    {d.status === "submitted" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await reopen.mutateAsync(d.id);
                          toast.success(t("courseDetail.deliverables.reopened", "Reopened"));
                        }}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> {t("courseDetail.deliverables.reopen", "Reopen")}
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditing(d)}
                      className="touch-target inline-flex items-center justify-center rounded-md text-muted hover:text-fg"
                      aria-label={t("common.edit")}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}

      <DeliverableForm
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        deliverable={editing}
        defaultCourse={courseCode}
        courses={courses}
      />
    </div>
  );
}

// ───────── Tasks tab ─────────

function TasksTab({
  tasks,
  courses,
  defaultCourse,
}: {
  tasks: Task[];
  courses: Course[];
  defaultCourse: CourseCode;
}) {
  const { t: tr } = useTranslation();
  const complete = useCompleteTask();
  const reopen = useReopenTask();
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  async function onComplete(t: Task) {
    try {
      await complete.mutateAsync(t.id);
      toast.success(tr("courseDetail.tasks.completedToast", { defaultValue: "Completed: {{title}}", title: t.title }), {
        action: {
          label: tr("common.undo", "Undo"),
          onClick: async () => {
            await reopen.mutateAsync(t.id);
            toast.success(tr("courseDetail.deliverables.restored", "Restored"));
          },
        },
      });
    } catch (e) {
      toast.error((e as Error).message || tr("common.failed"));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> {tr("forms.task.titleAdd")}
        </Button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState title={tr("courseDetail.tasks.empty", "No tasks for this course")} />
      ) : (
        <div className="card p-4">
          <ul className="divide-y divide-border/50">
            {[...tasks]
              .sort((a, b) => {
                if (a.status === "done" && b.status !== "done") return 1;
                if (b.status === "done" && a.status !== "done") return -1;
                if (!a.due_at && !b.due_at) return 0;
                if (!a.due_at) return 1;
                if (!b.due_at) return -1;
                return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
              })
              .map((t) => (
                <li
                  key={t.id}
                  className="py-3 flex items-start gap-3 first:pt-0 last:pb-0"
                >
                  <button
                    type="button"
                    onClick={() => (t.status === "done" ? reopen.mutate(t.id) : onComplete(t))}
                    className={cn(
                      "touch-target rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                      t.status === "done"
                        ? "border-ok bg-ok/20 text-ok"
                        : "border-border/60 hover:border-ok hover:bg-ok/10"
                    )}
                    aria-label={t.status === "done" ? tr("courseDetail.deliverables.reopen", "Reopen") : tr("courseDetail.tasks.complete", "Complete")}
                  >
                    {t.status === "done" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <span className="h-3.5 w-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditing(t)}
                    className={cn(
                      "min-w-0 flex-1 text-left",
                      t.status === "done" && "text-muted line-through"
                    )}
                  >
                    <p className="text-sm font-medium">{t.title}</p>
                    {t.description && (
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">{t.description}</p>
                    )}
                  </button>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <StatusChip status={t.status} />
                    {t.due_at && <CountdownChip target={t.due_at} />}
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}

      <TaskForm
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        task={editing}
        defaultCourse={defaultCourse}
        courses={courses}
      />
    </div>
  );
}

function groupByChapter(topics: StudyTopic[]): Record<string, StudyTopic[]> {
  const out: Record<string, StudyTopic[]> = {};
  for (const t of topics) {
    const key = t.chapter ?? "—";
    out[key] ??= [];
    out[key].push(t);
  }
  return out;
}

// Keep symbol references alive to avoid dead imports warning
void useUpdateStudyTopic;
