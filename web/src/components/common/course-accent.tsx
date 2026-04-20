import type { CSSProperties } from "react";
import type { CourseCode } from "@/data/types";
import { courseAccentVar } from "@/lib/theme";
import { cn } from "@/lib/cn";

export function CourseDot({ code, className }: { code: CourseCode; className?: string }) {
  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full", className)}
      style={{ background: courseAccentVar(code) }}
      aria-hidden
    />
  );
}

/** The course pill — bordered chip with the course code + accent dot. */
export function CourseBadge({ code, className }: { code: CourseCode; className?: string }) {
  return (
    <span
      className={cn("course-pill", className)}
      style={{ ["--accent" as string]: courseAccentVar(code) } as CSSProperties}
    >
      <span className="course-dot" />
      {code}
    </span>
  );
}

export function CourseAccentBar({ code, className }: { code: CourseCode; className?: string }) {
  return (
    <span
      className={cn("block h-1 w-full rounded-t-lg", className)}
      style={{ background: courseAccentVar(code) }}
      aria-hidden
    />
  );
}
