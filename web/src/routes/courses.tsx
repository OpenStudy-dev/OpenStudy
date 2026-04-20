import { useState } from "react";
import { Loader2, Plus, BookOpen } from "lucide-react";
import { Header } from "@/components/layout/header";
import { CourseCard } from "@/components/dashboard/course-card";
import { CourseForm } from "@/components/forms/course-form";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/common/fab";
import { useDashboard } from "@/lib/queries";
import type { Course, CourseCode } from "@/data/types";

export default function Courses() {
  const { data, isPending, error } = useDashboard();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);

  if (isPending) {
    return (
      <>
        <Header title="Courses" />
        <div className="px-4 py-12 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        </div>
      </>
    );
  }
  if (error || !data) {
    return (
      <>
        <Header title="Courses" />
        <div className="px-4 py-12 text-center text-sm text-critical">Couldn't load courses.</div>
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

  return (
    <>
      <Header
        title="Courses"
        subtitle={`${data.courses.length} module${data.courses.length === 1 ? "" : "s"}`}
      />
      <div className="px-4 md:px-8 py-4 md:py-6 max-w-[1000px] mx-auto w-full">
        {data.courses.length === 0 ? (
          <EmptyCourses onCreate={() => setCreateOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.courses.map((c) => {
              const fb = data.fall_behind.find((f) => f.course_code === c.code);
              return (
                <div key={c.code} className="relative group">
                  <CourseCard
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditing(c);
                    }}
                    className="absolute top-2 right-2 text-[10px] font-mono tracking-[0.04em] uppercase text-subtle hover:text-fg px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity bg-surface-2/80 backdrop-blur-sm"
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CourseForm open={createOpen} onOpenChange={setCreateOpen} />
      <CourseForm
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        course={editing}
      />
      {data.courses.length > 0 && (
        <Fab onClick={() => setCreateOpen(true)} label="Add course" />
      )}
    </>
  );
}

function EmptyCourses({ onCreate }: { onCreate: () => void }) {
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
          No courses yet.
        </h2>
        <p className="text-sm text-muted mt-1 max-w-md">
          Add your first course to get going. Everything else — schedule, lectures, topics,
          deadlines, tasks — hangs off courses.
        </p>
      </div>
      <Button onClick={onCreate}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add your first course
      </Button>
    </div>
  );
}
