/**
 * Swiss sidebar — ported from docs/examples/openstudy-v6.html.
 * Renders when theme === "swiss". Omits invented "Saleh"/issue-number
 * branding and the fake status footer.
 */
import type { CSSProperties, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppSettings, useCourses } from "@/lib/queries";

function cv(code: string) { return `var(--course-${code.toLowerCase()})`; }
function pad(n: number) { return String(n).padStart(2, "0"); }

function SLink({
  to, end, children, className = "s-item", style,
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

export function SwissSidebar() {
  const { t } = useTranslation();
  const courses = useCourses();
  const settings = useAppSettings();

  const displayName = (settings.data?.display_name ?? "").trim() || "Student";
  const lastName = displayName.split(" ").slice(-1)[0] || displayName;
  const semesterLabel = settings.data?.semester_label?.trim() || "";
  const institution = settings.data?.institution?.trim() || "";
  const totalEcts = (courses.data ?? []).reduce((s, c) => s + (c.ects ?? 0), 0);
  const totalCourses = (courses.data ?? []).length;

  return (
    <aside className="s-side">
      <div className="s-sig">
        <span className="s-bar" />
        {lastName}
      </div>

      {(institution || semesterLabel || totalCourses > 0) && (
        <div className="s-id">
          {[institution, semesterLabel].filter(Boolean).map((s, i, arr) => (
            <span key={i}>
              {i === arr.length - 1 ? <b>{s}</b> : <>{s} · </>}
            </span>
          ))}
          {totalCourses > 0 && (
            <>
              <br />
              {totalCourses} module{totalCourses === 1 ? "" : "s"} · {totalEcts} ECTS
            </>
          )}
        </div>
      )}

      <div className="s-sect">
        {t("nav.pages")} <span>{pad(1)}–{pad(5)}</span>
      </div>
      <SLink to="/" end>
        <span className="s-n">01</span>
        <span>{t("nav.today")}</span>
      </SLink>
      <SLink to="/courses" end>
        <span className="s-n">02</span>
        <span>{t("nav.courses")}</span>
      </SLink>
      <SLink to="/tasks">
        <span className="s-n">03</span>
        <span>{t("nav.tasks")}</span>
      </SLink>
      <SLink to="/exams">
        <span className="s-n">04</span>
        <span>{t("nav.exams")}</span>
      </SLink>
      <SLink to="/files">
        <span className="s-n">05</span>
        <span>{t("nav.files")}</span>
      </SLink>

      <div className="s-sect">
        {t("nav.courses")} <span>{pad(totalCourses)}</span>
      </div>
      {(courses.data ?? []).map((c) => {
        const shortName = c.full_name.split(/[,&]/)[0].trim();
        return (
          <SLink
            key={c.code}
            to={`/courses/${c.code}`}
            className="s-course"
            style={{ "--accent": cv(c.code) } as CSSProperties}
          >
            <div className="s-tag">{c.code}</div>
            <div style={{ minWidth: 0 }}>
              <div className="s-nm">{shortName}</div>
              <div className="s-sub">
                {c.module_code ? `${c.module_code} · ` : ""}{c.ects ?? "–"}EC
              </div>
            </div>
            <span style={{ fontFamily: "var(--s-font-mono)", fontSize: 10, color: "var(--s-ink-4)" }} />
          </SLink>
        );
      })}

      <div className="s-sect">
        {t("nav.archive")} <span>02</span>
      </div>
      <SLink to="/activity">
        <span className="s-n">06</span>
        <span>{t("nav.activity")}</span>
      </SLink>
      <SLink to="/settings">
        <span className="s-n">07</span>
        <span>{t("nav.settings")}</span>
      </SLink>
    </aside>
  );
}
