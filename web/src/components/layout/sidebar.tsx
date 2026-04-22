import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  ListChecks,
  FolderOpen,
  GraduationCap,
  Activity,
  Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppSettings, useCourses, useDashboard } from "@/lib/queries";
import { courseAccentVar } from "@/lib/theme";
import { cn } from "@/lib/cn";
import type { CourseCode } from "@/data/types";
import { semesterWeek } from "@/lib/time";

function deriveMonogram(name: string | null | undefined, fallback: string): string {
  if (!name) return fallback;
  const initial = name.trim().charAt(0).toUpperCase();
  return initial || fallback;
}

type NavItemDef = {
  to: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
};

const workspace: NavItemDef[] = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/courses", labelKey: "nav.courses", icon: BookOpen },
  { to: "/tasks", labelKey: "nav.tasks", icon: ListChecks },
  { to: "/files", labelKey: "nav.files", icon: FolderOpen },
  { to: "/exams", labelKey: "nav.exams", icon: GraduationCap },
];
const systemItems: NavItemDef[] = [
  { to: "/activity", labelKey: "nav.activity", icon: Activity },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];

const mobileOrder = ["/", "/courses", "/tasks", "/files", "/exams"];

export function Sidebar() {
  const { t } = useTranslation();
  const courses = useCourses();
  const dashboard = useDashboard();
  const settings = useAppSettings();

  const openTasksCount = dashboard.data?.tasks.filter(
    (t) => t.status !== "done" && t.status !== "skipped"
  ).length;

  const now = dashboard.data ? new Date(dashboard.data.now) : new Date();
  const week = semesterWeek(now, settings.data?.semester_start);

  const displayName = settings.data?.display_name ?? "";
  const monogram = (settings.data?.monogram || deriveMonogram(displayName, "?")).slice(0, 2);
  const semesterLabel = settings.data?.semester_label ?? "";

  const behindByCourse = new Map(
    (dashboard.data?.fall_behind ?? [])
      .filter((f) => f.severity !== "ok")
      .map((f) => [f.course_code, f.severity])
  );

  return (
    <aside className="hidden md:flex flex-col w-[210px] shrink-0 border-r border-border sticky top-0 h-[100dvh] bg-surface overflow-hidden">
      {/* Crest / head */}
      <div className="px-[18px] pt-[22px] pb-[18px] border-b border-hairline relative">
        <div className="flex items-center gap-[10px] mb-2">
          <div
            className="w-8 h-8 rounded-full bg-bg border grid place-items-center font-serif text-[15px] leading-none"
            style={{
              borderColor: "var(--border-strong)",
              fontVariationSettings: '"opsz" 144, "SOFT" 30',
              letterSpacing: "-0.02em",
            }}
          >
            {monogram}
          </div>
          <div className="min-w-0">
            <div
              className="font-serif text-[17px] font-medium leading-[1.1] truncate"
              style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30' }}
            >
              {displayName || "OpenStudy"}
            </div>
            <div className="font-mono text-[10px] text-subtle tracking-[0.1em] uppercase mt-[2px]">
              {displayName ? "OpenStudy" : "Set up your profile"}
            </div>
          </div>
        </div>
        {(semesterLabel || week !== null) && (
          <div className="mt-[14px] px-[10px] py-2 bg-bg border border-hairline rounded-[7px] flex items-center justify-between font-mono text-[10.5px] tracking-[0.06em] text-muted">
            {semesterLabel && <span className="text-fg font-medium truncate">{semesterLabel}</span>}
            {semesterLabel && week !== null && <span className="h-px w-[14px] bg-border-strong mx-2 flex-none" />}
            {week !== null && (
              <span className="flex-none">
                {week > 0 ? `${t("common.week")} ${String(week).padStart(2, "0")}` : t("common.preStart")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 pt-[14px] pb-5">
        <NavSection label={t("nav.pages")}>
          {workspace.map((item) => {
            const isTasks = item.to === "/tasks";
            return (
              <SidebarLink
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={t(item.labelKey)}
                end={item.end}
                count={isTasks ? openTasksCount : undefined}
              />
            );
          })}
        </NavSection>

        <NavSection label={t("nav.courses")}>
          {(courses.data ?? []).map((c) => {
            const accent = courseAccentVar(c.code as CourseCode);
            const behind = behindByCourse.get(c.code);
            return (
              <NavLink
                key={c.code}
                to={`/courses/${c.code}`}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-[10px] px-[10px] py-2 rounded-md transition-colors relative",
                    "hover:bg-surface-2",
                    isActive ? "bg-surface-2 text-fg" : "text-fg-dim"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute -left-3 top-[6px] bottom-[6px] w-[2px] rounded-r bg-fg"
                      />
                    )}
                    <span
                      className="w-[3px] h-4 rounded-sm shrink-0"
                      style={{ background: accent }}
                    />
                    <span
                      className="font-mono text-[11px] font-semibold tracking-[0.06em] min-w-[26px]"
                      style={{ color: accent }}
                    >
                      {c.code}
                    </span>
                    <span
                      className="font-serif text-[13px] truncate flex-1 min-w-0"
                      style={{
                        fontVariationSettings: '"opsz" 72, "SOFT" 30',
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {c.full_name.split(",")[0]}
                    </span>
                    {behind && (
                      <span
                        aria-label={`${behind}`}
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          background: behind === "critical" ? "var(--critical)" : "var(--warn)",
                        }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </NavSection>

        <NavSection label={t("nav.sections")}>
          {systemItems.map((item) => (
            <SidebarLink
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={t(item.labelKey)}
            />
          ))}
        </NavSection>
      </div>

    </aside>
  );
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-px mb-[18px]">
      <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-subtle px-[10px] py-[6px] font-medium flex items-center gap-2">
        {label}
        <span className="flex-1 h-px bg-hairline" />
      </div>
      {children}
    </div>
  );
}

function SidebarLink({
  to,
  icon: Icon,
  label,
  end,
  count,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  end?: boolean;
  count?: number;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-[10px] px-[10px] py-[7px] rounded-md text-[13px] transition-colors whitespace-nowrap",
          "hover:bg-surface-2 hover:text-fg",
          isActive ? "bg-surface-2 text-fg" : "text-fg-dim"
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden
              className="absolute -left-3 top-[6px] bottom-[6px] w-[2px] rounded-r bg-fg"
            />
          )}
          <Icon className={cn("h-[14px] w-[14px] shrink-0", isActive ? "text-fg" : "text-subtle")} />
          <span className="flex-1 min-w-0 truncate">{label}</span>
          {typeof count === "number" && count > 0 && (
            <span className="font-mono text-[10.5px] text-subtle tracking-[0.04em]">{count}</span>
          )}
        </>
      )}
    </NavLink>
  );
}

// ── Mobile bottom nav ───────────────────────────────────────────────────────
const allMobile = [...workspace, ...systemItems];

export function BottomNav() {
  const { t } = useTranslation();
  const mobileItems = mobileOrder
    .map((to) => allMobile.find((i) => i.to === to))
    .filter((x): x is (typeof allMobile)[number] => Boolean(x));

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 bg-bg border-t border-border safe-bottom">
      <ul className="grid grid-cols-5">
        {mobileItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] touch-target",
                  isActive ? "text-fg" : "text-muted"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.25]")} />
                  <span>{t(item.labelKey)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
