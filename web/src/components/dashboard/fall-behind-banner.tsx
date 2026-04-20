import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { CourseCode } from "@/data/types";
import type { FallBehindItem } from "@/lib/fall-behind";
import { courseAccentVar } from "@/lib/theme";
import { fmtDateShort, relative } from "@/lib/time";

export function FallBehindBanner({ items }: { items: FallBehindItem[] }) {
  const active = items.filter((i) => i.severity !== "ok");
  if (active.length === 0) return null;

  const hasCritical = active.some((i) => i.severity === "critical");
  const severity: "warn" | "critical" = hasCritical ? "critical" : "warn";
  const totalTopics = active.reduce((s, i) => s + i.topics.length, 0);

  const bgStyle: CSSProperties =
    severity === "critical"
      ? {
          background: "color-mix(in oklch, var(--critical) 6%, var(--surface))",
          borderColor: "color-mix(in oklch, var(--critical) 55%, var(--border))",
        }
      : {
          background: "color-mix(in oklch, var(--warn) 4%, var(--surface))",
          borderColor: "color-mix(in oklch, var(--warn) 40%, var(--border))",
        };

  const pulseColor = severity === "critical" ? "var(--critical)" : "var(--warn)";
  const critical = active.find((i) => i.severity === "critical");

  return (
    <div
      role="alert"
      className="rounded-[var(--radius)] border p-4 md:px-4 flex gap-4 md:gap-[18px] items-start mb-5 relative overflow-hidden animate-slide-up"
      style={bgStyle}
    >
      <div className="w-8 flex justify-center pt-0.5 shrink-0">
        <span className="pulse-ring" style={{ background: pulseColor, color: pulseColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <h3
          className="font-serif text-[20px] font-normal tracking-[-0.005em] m-0 mb-1"
          style={{
            fontVariationSettings: '"opsz" 72, "SOFT" 30',
            color:
              severity === "critical"
                ? "color-mix(in oklch, var(--critical) 70%, var(--fg))"
                : "var(--fg)",
          }}
        >
          {severity === "critical"
            ? "Falling behind, and the next lecture is close."
            : `Falling behind in ${active.length} course${active.length === 1 ? "" : "s"}.`}
        </h3>
        <p className="text-[13.5px] text-fg-dim">
          <b className="font-mono font-semibold text-fg">{totalTopics}</b>{" "}
          {totalTopics === 1 ? "topic" : "topics"} unstudied across{" "}
          <b className="font-medium text-fg">
            {active.map((i) => i.course_code).join(" & ")}
          </b>
          .{" "}
          {critical && critical.next_lecture_at
            ? `${critical.course_code} lecture ${relative(critical.next_lecture_at).label} — still no prep.`
            : "Clear them before the next lecture on each."}
        </p>

        <div className="mt-2.5 grid grid-cols-1 sm:[grid-template-columns:repeat(auto-fit,minmax(240px,1fr))] gap-x-3.5 gap-y-2">
          {active.map((i) => (
            <BehindRow key={i.course_code} item={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BehindRow({ item }: { item: FallBehindItem }) {
  const code = item.course_code as CourseCode;
  return (
    <Link
      to={`/courses/${code}`}
      className="flex items-center gap-2.5 text-[13px] text-fg-dim px-2.5 py-1.5 rounded-md bg-[color-mix(in_oklch,var(--fg)_2%,transparent)] border border-hairline hover:bg-surface-2 transition-colors min-w-0"
      style={{ ["--accent" as string]: courseAccentVar(code) } as CSSProperties}
    >
      <span
        className="course-pill shrink-0"
        style={{ ["--accent" as string]: courseAccentVar(code) } as CSSProperties}
      >
        <span className="course-dot" />
        {code}
      </span>
      <span className="text-[12.5px] text-fg-dim whitespace-nowrap">
        <b className="font-mono font-semibold text-fg">{item.topics.length}</b>{" "}
        <span className="text-muted">
          {item.topics.length === 1 ? "topic" : "topics"}
        </span>
      </span>
      <span className="text-[12px] text-muted truncate flex-1 min-w-0">
        {item.last_covered_on ? `since ${fmtDateShort(item.last_covered_on)}` : "unstudied"}
      </span>
      {item.next_lecture_at && (
        <span className="font-mono text-[11.5px] text-muted ml-auto shrink-0">
          next {relative(item.next_lecture_at).label}
        </span>
      )}
    </Link>
  );
}
