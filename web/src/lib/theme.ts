import type { Course, CourseCode } from "@/data/types";

/**
 * Course accents are stored per-row in the DB (`courses.color_hex`).
 * At runtime we register one CSS custom property per course
 * (e.g. `--course-asb: #7aa5e8`) on the document root, so anywhere in the
 * app that wants an accent can refer to it via `var(--course-<code>)`.
 *
 * When a course has no color_hex, we fall back to a deterministic color
 * derived from the code so brand-new courses still look distinct.
 */

const DEFAULT_PALETTE = [
  "#7aa5e8", // blue
  "#7ec495", // emerald
  "#e3ba6c", // amber
  "#e39aa2", // rose
  "#b28ae5", // violet
  "#71c8d0", // teal
  "#e8a774", // orange
  "#a3c47a", // lime
];

function hashCode(code: string): number {
  let h = 0;
  for (let i = 0; i < code.length; i++) {
    h = (h * 31 + code.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Deterministic fallback color for a course with no explicit `color_hex`. */
export function fallbackAccent(code: CourseCode): string {
  return DEFAULT_PALETTE[hashCode(code) % DEFAULT_PALETTE.length];
}

/** The hex color we should render for a course right now. */
export function accentHex(course: Pick<Course, "code" | "color_hex"> | undefined | null, fallbackCode?: string): string {
  if (course?.color_hex) return course.color_hex;
  const code = course?.code ?? fallbackCode;
  return code ? fallbackAccent(code) : "#7a7a7a";
}

/** CSS reference: `var(--course-<code>)`. Only valid after `applyCourseColors` ran. */
export function courseAccentVar(code: CourseCode): string {
  return `var(--course-${code.toLowerCase()}, ${fallbackAccent(code)})`;
}

/** Publish one CSS custom property per course onto :root. Idempotent. */
export function applyCourseColors(courses: readonly Course[] | undefined | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!courses) return;
  for (const c of courses) {
    const color = c.color_hex || fallbackAccent(c.code);
    root.style.setProperty(`--course-${c.code.toLowerCase()}`, color);
  }
}
