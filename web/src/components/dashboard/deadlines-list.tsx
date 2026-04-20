import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { Deliverable, CourseCode } from "@/data/types";
import { courseAccentVar } from "@/lib/theme";
import { fmtBerlin, fmtTime, relative } from "@/lib/time";
import { ExternalLink } from "lucide-react";

const severityColor: Record<string, string> = {
  urgent: "var(--critical)",
  soon: "var(--warn)",
};

export function DeadlinesList({ deliverables }: { deliverables: Deliverable[] }) {
  const upcoming = deliverables
    .filter((d) => d.status === "open" || d.status === "in_progress")
    .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
    .slice(0, 8);

  if (upcoming.length === 0) {
    return <p className="text-sm text-muted px-4 py-6">Nothing due.</p>;
  }

  return (
    <div>
      {upcoming.map((d) => {
        const code = d.course_code as CourseCode;
        const accent = courseAccentVar(code);
        const rt = relative(d.due_at);
        const dueTime = fmtTime(d.due_at);
        const dateLabel = fmtBerlin(d.due_at, "EEE, d MMM");
        const sevColor = severityColor[rt.severity];

        return (
          <Link
            key={d.id}
            to={`/courses/${code}`}
            className="grid items-center gap-3 px-4 py-3 border-b border-hairline last:border-b-0 cursor-pointer transition-colors hover:bg-surface-2 relative"
            style={
              {
                gridTemplateColumns: "52px 1fr auto 68px",
                ["--accent" as string]: accent,
              } as CSSProperties
            }
          >
            <span
              aria-hidden
              className="absolute left-0 top-2 bottom-2 w-[2px] rounded-sm opacity-70"
              style={{ background: accent }}
            />
            <span
              className="course-pill"
              style={{ ["--accent" as string]: accent } as CSSProperties}
            >
              <span className="course-dot" />
              {code}
            </span>
            <div className="min-w-0">
              <div className="text-[13px] text-fg truncate leading-[1.3] tracking-[-0.002em]">
                {d.name}
              </div>
              <div className="font-mono text-[10.5px] text-subtle tracking-[0.04em] uppercase mt-[3px] flex items-center gap-2 truncate">
                <span>{d.kind}</span>
                <span className="text-hairline">·</span>
                <span>
                  {dateLabel}, {dueTime}
                </span>
                {d.external_url && (
                  <span className="text-muted normal-case ml-1 inline-flex items-center">
                    <ExternalLink className="h-3 w-3" />
                  </span>
                )}
              </div>
            </div>
            <span className="status-chip" data-s={d.status}>
              {d.status.replace("_", " ")}
            </span>
            <span
              className="font-mono text-[11.5px] tabular-nums tracking-[0.02em] text-right min-w-[64px]"
              style={{ color: sevColor ?? "var(--muted)" }}
            >
              {rt.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
