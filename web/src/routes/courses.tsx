import { useState } from "react";
import { Loader2, Plus, BookOpen, Archive, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { CourseCard } from "@/components/dashboard/course-card";
import { CourseForm } from "@/components/forms/course-form";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/common/fab";
import { useDashboard } from "@/lib/queries";
import type { Course, CourseCode } from "@/data/types";
import { cn } from "@/lib/cn";

export default function Courses() {
  const { t } = useTranslation();
  const { data, isPending, error } = useDashboard({ includeArchived: true });
  const [createOpen, setCreateOpen] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  if (isPending) {
    return (
      <>
        <Header title={t("courses.title")} />
        <div className="px-4 py-12 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        </div>
      </>
    );
  }
  if (error || !data) {
    return (
      <>
        <Header title={t("courses.title")} />
        <div className="px-4 py-12 text-center text-sm text-critical">
          {t("dashboard.loadFailed")}
        </div>
      </>
    );
  }

  const progressFor = (code: string): number => {
    const weights: Record<string, number> = {
      not_started: 0, struggling: 0.2, in_progress: 0.5, studied: 0.9, mastered: 1,
    };
    const list = data.study_topics.filter((t) => t.course_code === code);
    if (list.length === 0) return 0;
    const total = list.reduce((s, t) => s + (weights[t.status] ?? 0), 0);
    return Math.round((total / list.length) * 100);
  };

  const active = data.courses.filter((c) => !c.archived);
  const archived = data.courses.filter((c) => c.archived);

  const card = (c: Course) => {
    const fb = data.fall_behind.find((f) => f.course_code === c.code);
    return (
      <CourseCard
        key={c.code}
        course={c}
        progress={progressFor(c.code)}
        nextLectureAt={fb?.next_lecture_at ? new Date(fb.next_lecture_at) : null}
        fallBehind={{
          course_code: c.code as CourseCode,
          topics: fb?.topics ?? [],
          last_covered_on: fb?.last_covered_on ? new Date(fb.last_covered_on) : null,
          next_lecture_at: fb?.next_lecture_at ? new Date(fb.next_lecture_at) : null,
          severity: fb?.severity ?? "ok",
        }}
      />
    );
  };

  return (
    <>
      <Header
        title={t("courses.title")}
        subtitle={t(
          active.length === 1 ? "courses.metaModules" : "courses.metaModulesPlural",
          { count: active.length }
        )}
      />
      <div className="px-4 md:px-8 py-4 md:py-6 max-w-[1000px] mx-auto w-full">
        {active.length === 0 ? (
          <EmptyCourses onCreate={() => setCreateOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{active.map(card)}</div>
        )}

        {archived.length > 0 && (
          <section className="mt-8">
            <button
              type="button"
              onClick={() => setShowArchive((v) => !v)}
              aria-expanded={showArchive}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-fg transition-colors"
            >
              <Archive className="h-4 w-4" />
              {t("courses.archive.toggle", { count: archived.length })}
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", showArchive && "rotate-180")}
              />
            </button>
            {showArchive && (
              <>
                <p className="text-xs text-muted mt-1">{t("courses.archive.hint")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 opacity-70">
                  {archived.map(card)}
                </div>
              </>
            )}
          </section>
        )}
      </div>

      <CourseForm open={createOpen} onOpenChange={setCreateOpen} />
      {active.length > 0 && (
        <Fab onClick={() => setCreateOpen(true)} label={t("courses.fab")} />
      )}
    </>
  );
}

function EmptyCourses({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="card px-8 py-16 flex flex-col items-center gap-4 text-center">
      <div className="w-12 h-12 rounded-full bg-surface-2 grid place-items-center">
        <BookOpen className="h-5 w-5 text-muted" />
      </div>
      <div>
        <h2
          className="font-serif text-[22px] font-normal tracking-[-0.005em]"
          style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30' }}
        >
          {t("courses.empty.title")}
        </h2>
        <p className="text-sm text-muted mt-1 max-w-md">{t("courses.empty.body")}</p>
      </div>
      <Button onClick={onCreate}>
        <Plus className="h-4 w-4 mr-1.5" />
        {t("courses.empty.cta")}
      </Button>
    </div>
  );
}
