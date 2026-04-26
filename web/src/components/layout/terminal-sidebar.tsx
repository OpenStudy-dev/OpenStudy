/**
 * Terminal-theme sidebar — ported from docs/examples/openstudy-v2.html.
 * Renders instead of <Sidebar> when theme === "terminal".
 * Mirrors real data: courses, settings, dashboard counters.
 */
import type { CSSProperties, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppSettings, useCourses, useDashboard } from "@/lib/queries";
function courseVar(code: string) {
  return `var(--course-${code.toLowerCase()})`;
}

function Icon({ name, size = 14 }: { name: string; size?: number }) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "square" as const,
    strokeLinejoin: "miter" as const,
  };
  const paths: Record<string, ReactNode> = {
    home: <path d="M3 11 12 3l9 8v10H3z" />,
    cal: (
      <g>
        <rect x="3" y="5" width="18" height="16" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </g>
    ),
    book: (
      <g>
        <path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z" />
        <path d="M4 17h14" />
      </g>
    ),
    inbox: (
      <g>
        <path d="M3 12h5l2 3h4l2-3h5" />
        <path d="M3 12v8h18v-8l-3-8H6z" />
      </g>
    ),
    folder: <path d="M3 6h6l2 2h10v12H3z" />,
    flask: (
      <g>
        <path d="M9 3v6L4 20h16L15 9V3" />
        <path d="M9 3h6" />
      </g>
    ),
    pulse: <path d="M3 12h4l2-5 4 10 2-5h6" />,
    cog: (
      <g>
        <circle cx="12" cy="12" r="3" />
        <path d="M4 12a8 8 0 0 1 .5-3l-2 -1 2 -3 2 1a8 8 0 0 1 2.5-1.5L10 2h4l1 2.5a8 8 0 0 1 2.5 1.5l2-1 2 3-2 1a8 8 0 0 1 0 6l2 1-2 3-2-1a8 8 0 0 1-2.5 1.5L14 22h-4l-1-2.5A8 8 0 0 1 6.5 18l-2 1-2-3 2-1A8 8 0 0 1 4 12z" />
      </g>
    ),
  };
  return <svg {...p}>{paths[name] ?? null}</svg>;
}

function TmLink({
  to,
  end,
  children,
  className = "tm-nav-item",
  style,
}: {
  to: string;
  end?: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const loc = useLocation();
  const isActive = end ? loc.pathname === to : loc.pathname === to || loc.pathname.startsWith(to + "/");
  return (
    <Link to={to} className={className} data-active={isActive} style={style}>
      {children}
    </Link>
  );
}

export function TerminalSidebar() {
  const { t } = useTranslation();
  const courses = useCourses();
  const settings = useAppSettings();
  const dashboard = useDashboard();

  const displayName = (settings.data?.display_name ?? "").trim() || "user";
  const institution = settings.data?.institution?.trim() || "";
  const semesterLabel = settings.data?.semester_label?.trim() || "";

  const behindByCourse = new Map(
    (dashboard.data?.fall_behind ?? []).map((f) => [f.course_code, f.topics.length])
  );

  return (
    <aside className="tm-nav">
      <div className="tm-nav-head">
        <div className="tm-line1">
          <span className="tm-blink" />
          DASH::STUDY
        </div>
        <div className="tm-user">{displayName.toUpperCase()}</div>
        <div className="tm-meta">
          {institution ? institution.toUpperCase() : "STUDY"}
          {semesterLabel ? ` · ${semesterLabel.toUpperCase()}` : ""}
        </div>
      </div>

      <div className="tm-nav-body">
        <div className="tm-nav-label">{t("nav.sections").toUpperCase()}</div>

        <TmLink to="/app" end>
          <span className="tm-ic"><Icon name="home" /></span>
          <span>{t("nav.today").toLowerCase()}</span>
        </TmLink>
        <TmLink to="/app/courses" end>
          <span className="tm-ic"><Icon name="book" /></span>
          <span>{t("nav.courses").toLowerCase()}</span>
        </TmLink>
        <TmLink to="/app/tasks">
          <span className="tm-ic"><Icon name="inbox" /></span>
          <span>{t("nav.tasks").toLowerCase()}</span>
        </TmLink>
        <TmLink to="/app/exams">
          <span className="tm-ic"><Icon name="flask" /></span>
          <span>{t("nav.exams").toLowerCase()}</span>
        </TmLink>
        <TmLink to="/app/files">
          <span className="tm-ic"><Icon name="folder" /></span>
          <span>{t("nav.files").toLowerCase()}</span>
        </TmLink>

        <div className="tm-nav-label">{t("nav.courses").toUpperCase()}</div>
        {(courses.data ?? []).map((c) => {
          const behind = behindByCourse.get(c.code) ?? 0;
          const shortName = c.full_name.split(/[,\s]+/).slice(0, 2).join(" ");
          return (
            <TmLink
              key={c.code}
              to={`/app/courses/${c.code}`}
              className="tm-nav-item tm-course"
              style={{ "--accent": courseVar(c.code) } as CSSProperties}
            >
              <span className="tm-stripe" />
              <span className="tm-code">{c.code}</span>
              <span className="tm-cname">{shortName}</span>
              {behind > 0 && <span className="tm-behind">-{behind}</span>}
            </TmLink>
          );
        })}

        <div className="tm-nav-label">{t("nav.archive").toUpperCase()}</div>
        <TmLink to="/app/activity">
          <span className="tm-ic"><Icon name="pulse" /></span>
          <span>{t("nav.activity").toLowerCase()}</span>
        </TmLink>
        <TmLink to="/app/settings">
          <span className="tm-ic"><Icon name="cog" /></span>
          <span>{t("nav.settings").toLowerCase()}</span>
        </TmLink>
      </div>

    </aside>
  );
}
