/**
 * Zine-theme sidebar — ported from docs/examples/openstudy-v3.html.
 * Renders when app theme === "zine". Omits the pull-quote and side-foot
 * from the design since they're flavor-only without real data behind them.
 */
import type { CSSProperties, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppSettings, useCourses } from "@/lib/queries";

function cv(code: string) { return `var(--course-${code.toLowerCase()})`; }

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Icon({ name }: { name: string }) {
  const p = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const paths: Record<string, ReactNode> = {
    home: <path d="M3 11 L12 3 L21 11 V21 H3 Z" />,
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

function ZLink({
  to, end, children, className = "z-item", style,
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

export function ZineSidebar() {
  const { t } = useTranslation();
  const courses = useCourses();
  const settings = useAppSettings();

  const displayName = (settings.data?.display_name ?? "").trim() || "you";
  const semesterLabel = settings.data?.semester_label?.trim() || "";

  return (
    <aside className="z-side">
      <div className="z-userchip">
        <div className="z-av">{initials(displayName)}</div>
        <div>
          <div className="z-t">{displayName}</div>
          {semesterLabel && <div className="z-s">{semesterLabel}</div>}
        </div>
      </div>

      <div className="z-lbl">~ {t("nav.pages").toLowerCase()} ~</div>
      <ZLink to="/" end>
        <span className="z-ic"><Icon name="home" /></span>
        <span>{t("nav.today").toLowerCase()}</span>
      </ZLink>
      <ZLink to="/courses" end>
        <span className="z-ic"><Icon name="book" /></span>
        <span>{t("nav.courses").toLowerCase()}</span>
      </ZLink>
      <ZLink to="/tasks">
        <span className="z-ic"><Icon name="inbox" /></span>
        <span>{t("nav.tasks").toLowerCase()}</span>
      </ZLink>
      <ZLink to="/exams">
        <span className="z-ic"><Icon name="flask" /></span>
        <span>{t("nav.exams").toLowerCase()}</span>
      </ZLink>
      <ZLink to="/files">
        <span className="z-ic"><Icon name="folder" /></span>
        <span>{t("nav.files").toLowerCase()}</span>
      </ZLink>

      <div className="z-lbl">~ {t("nav.courses").toLowerCase()} ~</div>
      {(courses.data ?? []).map((c) => {
        const shortName = c.full_name.split(/[,&]/)[0].trim();
        return (
          <ZLink
            key={c.code}
            to={`/courses/${c.code}`}
            className="z-course"
            style={{ "--accent": cv(c.code) } as CSSProperties}
          >
            <span className="z-tag">{c.code}</span>
            <div className="z-meta">
              <div className="z-n">{shortName}</div>
              <div className="z-e">
                {c.module_code ? `${c.module_code} · ` : ""}{c.ects ?? "–"} ects
              </div>
            </div>
          </ZLink>
        );
      })}

      <div className="z-lbl">~ {t("nav.archive").toLowerCase()} ~</div>
      <ZLink to="/activity">
        <span className="z-ic"><Icon name="pulse" /></span>
        <span>{t("nav.activity").toLowerCase()}</span>
      </ZLink>
      <ZLink to="/settings">
        <span className="z-ic"><Icon name="cog" /></span>
        <span>{t("nav.settings").toLowerCase()}</span>
      </ZLink>
    </aside>
  );
}
