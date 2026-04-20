import type { Course, CourseCode, Slot, StudyTopic } from "@/data/types";
import { differenceInHours, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { TZ } from "./time";

export type FallBehindSeverity = "ok" | "warn" | "critical";

export type FallBehindItem = {
  course_code: CourseCode;
  topics: StudyTopic[];
  last_covered_on: Date | null;
  next_lecture_at: Date | null;
  severity: FallBehindSeverity;
};

const BEHIND_GRACE_HOURS = 48;
const CRITICAL_WINDOW_HOURS = 48;
const IMMINENT_LECTURE_HOURS = 72;

export function computeFallBehind(
  courses: Course[],
  topics: StudyTopic[],
  slots: Slot[],
  now: Date = new Date()
): FallBehindItem[] {
  return courses.map((c) => {
    const courseTopics = topics.filter((t) => t.course_code === c.code);
    const next = nextLectureAt(c.code, slots, now);
    const imminent = next !== null && differenceInHours(next, now) <= IMMINENT_LECTURE_HOURS;
    const behind = courseTopics.filter((t) => {
      if (!t.covered_on) return false;
      if (t.status !== "not_started" && t.status !== "in_progress") return false;
      const covered = parseISO(t.covered_on);
      if (covered > now) return false;
      const hoursSince = differenceInHours(now, covered);
      return hoursSince >= BEHIND_GRACE_HOURS || imminent;
    });

    let severity: FallBehindSeverity = "ok";
    if (behind.length > 0) {
      severity = next && differenceInHours(next, now) <= CRITICAL_WINDOW_HOURS ? "critical" : "warn";
    }

    const lastCovered = behind
      .map((t) => (t.covered_on ? parseISO(t.covered_on) : null))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    return {
      course_code: c.code,
      topics: behind,
      last_covered_on: lastCovered,
      next_lecture_at: next,
      severity,
    };
  });
}

export function nextLectureAt(code: CourseCode, slots: Slot[], now: Date): Date | null {
  const berlin = toZonedTime(now, TZ);
  const courseSlots = slots.filter(
    (s) => s.course_code === code && (s.kind === "Vorlesung" || s.kind === "Übung")
  );
  if (courseSlots.length === 0) return null;

  // Search up to 7 days ahead
  let candidate: Date | null = null;
  for (let delta = 0; delta < 8; delta++) {
    const target = new Date(berlin);
    target.setDate(berlin.getDate() + delta);
    const weekday = ((target.getDay() + 6) % 7) + 1; // Mon=1..Sun=7
    for (const s of courseSlots) {
      if (s.weekday !== weekday) continue;
      const [h, m] = s.start_time.split(":").map(Number);
      const scheduled = new Date(target);
      scheduled.setHours(h, m, 0, 0);
      // Respect starts_on if set
      if (s.starts_on && scheduled < parseISO(s.starts_on)) continue;
      if (scheduled <= now) continue;
      if (!candidate || scheduled < candidate) candidate = scheduled;
    }
    if (candidate) break;
  }
  return candidate;
}

export function courseProgress(courseCode: CourseCode, topics: StudyTopic[]): number {
  const list = topics.filter((t) => t.course_code === courseCode);
  if (list.length === 0) return 0;
  const weightMap: Record<StudyTopic["status"], number> = {
    not_started: 0,
    struggling: 0.2,
    in_progress: 0.5,
    studied: 0.9,
    mastered: 1,
  };
  const total = list.reduce((s, t) => s + weightMap[t.status], 0);
  return Math.round((total / list.length) * 100);
}
