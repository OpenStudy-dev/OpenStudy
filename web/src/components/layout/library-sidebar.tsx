/**
 * Library sidebar — ported from docs/examples/openstudy-v4.html.
 * Renders when theme === "library". Drops the invented "Ex Libris" call
 * number and fake overdue stamp; keeps the card-catalog plate + volumes.
 */
import type { CSSProperties, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppSettings, useCourses } from "@/lib/queries";

function cv(code: string) { return `var(--course-${code.toLowerCase()})`; }

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

function LLink({
  to, end, children, className = "l-item", style,
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

export function LibrarySidebar() {
  const { t } = useTranslation();
  const courses = useCourses();
  const settings = useAppSettings();

  const displayName = (settings.data?.display_name ?? "").trim() || "the reader";
  const semesterLabel = settings.data?.semester_label?.trim() || "";
  const firstName = displayName.split(" ")[0];

  return (
    <aside className="l-side">
      <div className="l-plate">
        <div className="l-sig">Ex Libris</div>
        <div className="l-title">
          The {firstName}<br />Register
        </div>
        <div className="l-ornament">✦ · ✦ · ✦</div>
        {semesterLabel && <div className="l-sub">{semesterLabel}</div>}
      </div>

      <div className="l-sect"><span className="l-rn">§</span>{t("nav.sections")}</div>
      <LLink to="/" end>
        <span className="l-rn">I</span>
        <span className="l-nm">{t("nav.today")}</span>
      </LLink>
      <LLink to="/courses" end>
        <span className="l-rn">II</span>
        <span className="l-nm">{t("nav.courses")}</span>
      </LLink>
      <LLink to="/tasks">
        <span className="l-rn">III</span>
        <span className="l-nm">{t("nav.tasks")}</span>
      </LLink>
      <LLink to="/exams">
        <span className="l-rn">IV</span>
        <span className="l-nm">{t("nav.exams")}</span>
      </LLink>
      <LLink to="/files">
        <span className="l-rn">V</span>
        <span className="l-nm">{t("nav.files")}</span>
      </LLink>

      <div className="l-sect"><span className="l-rn">§</span>{t("nav.volumes")}</div>
      {(courses.data ?? []).map((c, i) => {
        const shortName = c.full_name.split(/[,&]/)[0].trim();
        return (
          <LLink
            key={c.code}
            to={`/courses/${c.code}`}
            className="l-vol"
            style={{ "--accent": cv(c.code) } as CSSProperties}
          >
            <div className="l-spine">{c.code}</div>
            <div className="l-meta">
              <div className="l-nm">{shortName}</div>
              <div className="l-ec">
                Vol. {ROMAN[i] ?? String(i + 1)}
                {c.ects != null && ` · ${c.ects} ECTS`}
              </div>
            </div>
          </LLink>
        );
      })}

      <div className="l-sect"><span className="l-rn">§</span>{t("nav.archive")}</div>
      <LLink to="/activity">
        <span className="l-rn">VI</span>
        <span className="l-nm">{t("nav.activity")}</span>
      </LLink>
      <LLink to="/settings">
        <span className="l-rn">VII</span>
        <span className="l-nm">{t("nav.settings")}</span>
      </LLink>
    </aside>
  );
}
