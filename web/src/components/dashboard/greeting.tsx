import type { CourseCode } from "@/data/types";
import { courseAccentVar } from "@/lib/theme";
import { relative } from "@/lib/time";
import { useAppSettings } from "@/lib/queries";

export function Greeting({
  now,
  nextUp,
  subline,
}: {
  now: Date;
  nextUp?: { code: CourseCode; at: Date } | null;
  subline?: string;
}) {
  const settings = useAppSettings();
  const firstName = (settings.data?.display_name ?? "").split(" ")[0] || "there";
  const institution = settings.data?.institution ?? "";
  const semesterLabel = settings.data?.semester_label ?? "";
  const locale = settings.data?.locale ?? "en-US";

  const hour = now.getHours();
  const period =
    hour < 5 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const copy =
    period === "night" ? `Up late, ${firstName}.` : `Good ${period}, ${firstName}.`;

  const dateStr = now.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const footLine = [semesterLabel, institution].filter(Boolean).join(" · ");

  return (
    <section className="flex flex-col md:flex-row md:flex-wrap md:items-end md:justify-between gap-3 md:gap-6 pt-4 pb-6 border-b border-hairline mb-6">
      <div className="min-w-0 md:flex-1">
        <h1
          className="font-serif m-0 font-normal leading-[1.02] tracking-[-0.015em] text-fg"
          style={{
            fontSize: "clamp(30px, 4vw, 46px)",
            fontVariationSettings: '"opsz" 72, "SOFT" 30',
          }}
        >
          <span className="ink-dot ink-dot-lg inline-block mr-[14px] -translate-y-[4px] align-middle" />
          {copy}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13.5px] text-muted">
          {nextUp && (
            <span
              className="font-mono text-[12px] px-[9px] py-[4px] border border-border rounded-full text-fg-dim bg-surface inline-flex items-center gap-1.5"
              style={{ ["--accent" as string]: courseAccentVar(nextUp.code) } as React.CSSProperties}
            >
              <span className="text-muted">Next up</span>
              <b className="font-medium text-fg">{nextUp.code}</b>
              <span className="text-subtle">·</span>
              <span className="text-fg-dim">{relative(nextUp.at, now).label}</span>
            </span>
          )}
          {subline && (
            <>
              <span className="text-subtle">·</span>
              <span>{subline}</span>
            </>
          )}
        </div>
      </div>

      <div className="md:text-right font-mono text-[11.5px] text-muted tracking-[0.04em] leading-[1.4] md:whitespace-nowrap">
        <b
          className="serif text-fg font-normal block"
          style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', letterSpacing: "-0.005em", fontSize: 20 }}
        >
          {dateStr}
        </b>
        {footLine && <span>{footLine}</span>}
      </div>
    </section>
  );
}
