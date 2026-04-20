import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { Course } from "@/data/types";
import type { FallBehindItem } from "@/lib/fall-behind";
import { courseAccentVar } from "@/lib/theme";
import { relative } from "@/lib/time";
import { cn } from "@/lib/cn";

export function CourseCard({
  course,
  progress,
  nextLectureAt,
  fallBehind,
}: {
  course: Course;
  progress: number;
  nextLectureAt: Date | null;
  fallBehind: FallBehindItem;
}) {
  const behind = fallBehind.severity !== "ok";
  const accent = courseAccentVar(course.code);
  const rt = nextLectureAt ? relative(nextLectureAt) : null;

  return (
    <Link
      to={`/courses/${course.code}`}
      className={cn(
        "card relative overflow-hidden block cursor-pointer transition-[border-color,transform] hover:border-border-strong",
        "px-4 pt-3.5 pb-3.5 flex flex-col gap-3 min-h-[148px]"
      )}
      style={{ ["--accent" as string]: accent } as CSSProperties}
    >
      <span
        aria-hidden
        className="absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-sm"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between gap-2.5">
        <span className="course-pill" style={{ ["--accent" as string]: accent } as CSSProperties}>
          <span className="course-dot" />
          {course.code}
        </span>
        {behind && (
          <span
            className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.02em]"
            style={{
              color: fallBehind.severity === "critical" ? "var(--critical)" : "var(--warn)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "currentColor" }}
            />
            {fallBehind.topics.length} behind
          </span>
        )}
      </div>

      <div
        className="font-serif text-[19px] font-normal leading-[1.15] tracking-[-0.005em] text-fg text-pretty"
        style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30' }}
      >
        {course.full_name}
      </div>

      <div className="flex items-center gap-2 font-mono text-[10.5px] text-muted tracking-[0.04em] -mt-1 flex-wrap">
        {course.module_code && <span>{course.module_code}</span>}
        {course.module_code && course.ects != null && <span className="text-subtle">·</span>}
        {course.ects != null && <span>{course.ects} ECTS</span>}
        {course.ects != null && course.language && <span className="text-subtle">·</span>}
        {course.language && <span>{course.language.slice(0, 2).toUpperCase()}</span>}
      </div>

      <div className="font-mono text-[11px] text-muted tracking-[0.02em]">
        Next ·{" "}
        {rt ? rt.label : <span className="text-subtle">no lectures planned</span>}
      </div>

      <div className="flex items-center gap-2.5 mt-auto">
        <div className="flex-1 h-[3px] rounded-sm bg-hairline overflow-hidden">
          <div
            className="h-full rounded-sm transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%`, background: accent }}
          />
        </div>
        <span className="font-mono text-[12px] text-fg tabular-nums min-w-[32px] text-right">
          {progress}%
        </span>
      </div>
    </Link>
  );
}
