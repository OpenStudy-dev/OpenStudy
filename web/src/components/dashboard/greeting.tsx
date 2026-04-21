import type { CourseCode } from "@/data/types";
import { courseAccentVar } from "@/lib/theme";
import { relative } from "@/lib/time";
import { useAppSettings } from "@/lib/queries";
import { useTranslation } from "react-i18next";

export function Greeting({
  now,
  nextUp,
  subline,
}: {
  now: Date;
  nextUp?: { code: CourseCode; at: Date } | null;
  subline?: string;
}) {
  const { t, i18n } = useTranslation();
  const settings = useAppSettings();
  const firstName =
    (settings.data?.display_name ?? "").split(" ")[0] ||
    t("dashboard.greetingFallbackName");
  const institution = settings.data?.institution ?? "";
  const semesterLabel = settings.data?.semester_label ?? "";
  const locale = i18n.language === "de" ? "de-DE" : "en-GB";

  const hour = now.getHours();
  const period =
    hour < 5 ? "Night" : hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  const copy = t(`dashboard.greeting${period}`, { name: firstName });

  const dateStr = now.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const footLine = [semesterLabel, institution].filter(Boolean).join(" · ");

  return (
    <section className="flex flex-col items-center text-center md:items-stretch md:text-left md:flex-row md:flex-wrap md:items-end md:justify-between gap-4 md:gap-6 pt-5 md:pt-4 pb-6 border-b border-hairline mb-6">
      <div className="min-w-0 md:flex-1">
        <h1
          className="font-serif m-0 font-normal leading-[1.05] md:leading-[1.02] tracking-[-0.015em] text-fg"
          style={{
            fontSize: "clamp(34px, 7.5vw, 46px)",
            fontVariationSettings: '"opsz" 72, "SOFT" 30',
          }}
        >
          <span className="ink-dot ink-dot-lg inline-block mr-[12px] md:mr-[14px] -translate-y-[3px] md:-translate-y-[4px] align-middle" />
          {copy}
        </h1>
        <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-2 text-[13.5px] text-muted">
          {nextUp && (
            <span
              className="font-mono text-[13px] md:text-[12px] px-3 md:px-[9px] py-[6px] md:py-[4px] border border-border rounded-full text-fg-dim bg-surface inline-flex items-center gap-1.5"
              style={{ ["--accent" as string]: courseAccentVar(nextUp.code) } as React.CSSProperties}
            >
              <span className="text-muted">{t("dashboard.nextUp")}</span>
              <b className="font-medium text-fg">{nextUp.code}</b>
              <span className="text-subtle">·</span>
              <span className="text-fg-dim">{relative(nextUp.at, now).label}</span>
            </span>
          )}
          {subline && (
            <>
              <span className="text-subtle hidden md:inline">·</span>
              <span>{subline}</span>
            </>
          )}
        </div>
      </div>

      {/* Date / institution — desktop only. On mobile this info lives in the
          DashboardTopStrip so the hero stays focused on greeting + Next-up. */}
      <div className="hidden md:block font-mono text-[11.5px] text-muted tracking-[0.04em] leading-[1.4] text-right whitespace-nowrap">
        <b
          className="serif text-fg font-normal block"
          style={{
            fontVariationSettings: '"opsz" 72, "SOFT" 30',
            letterSpacing: "-0.005em",
            fontSize: 20,
          }}
        >
          {dateStr}
        </b>
        {footLine && <span>{footLine}</span>}
      </div>
    </section>
  );
}
