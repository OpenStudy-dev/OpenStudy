import { useState, type CSSProperties } from "react";
import { Check, Loader2, Pencil, RotateCcw, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type { Course, CourseCode, Task } from "@/data/types";
import { courseAccentVar } from "@/lib/theme";
import { relative } from "@/lib/time";
import { EmptyState } from "@/components/common/empty-state";
import { useCompleteTask, useReopenTask } from "@/lib/queries";
import { cn } from "@/lib/cn";
import { TaskForm } from "@/components/forms/task-form";

const severityColor: Record<string, string> = {
  urgent: "var(--critical)",
  soon: "var(--warn)",
};

export function TaskInbox({ tasks, courses }: { tasks: Task[]; courses: Course[] }) {
  const complete = useCompleteTask();
  const reopen = useReopenTask();
  const [editing, setEditing] = useState<Task | null>(null);
  const [showDone, setShowDone] = useState(false);

  const open = tasks
    .filter((t) => t.status !== "done" && t.status !== "skipped")
    .sort(byDue);
  const done = tasks.filter((t) => t.status === "done").sort(byCompletedDesc);

  async function onComplete(t: Task) {
    try {
      await complete.mutateAsync(t.id);
      toast.success(`Completed: ${t.title}`, {
        action: {
          label: "Undo",
          onClick: async () => {
            await reopen.mutateAsync(t.id);
            toast.success("Restored");
          },
        },
      });
    } catch (e) {
      toast.error((e as Error).message || "Failed");
    }
  }

  async function onReopen(t: Task) {
    try {
      await reopen.mutateAsync(t.id);
      toast.success("Reopened");
    } catch (e) {
      toast.error((e as Error).message || "Failed");
    }
  }

  if (open.length === 0 && done.length === 0) {
    return (
      <div className="px-4 py-6">
        <EmptyState title="Inbox zero" description="No tasks yet." />
      </div>
    );
  }

  return (
    <>
      {open.length === 0 ? (
        <div className="px-4 py-6">
          <EmptyState title="Inbox zero" description="All open tasks complete. 🎉" />
        </div>
      ) : (
        <div>
          {open.map((t) => {
            const pending = complete.isPending && complete.variables === t.id;
            const code = t.course_code as CourseCode | null;
            const accent = code ? courseAccentVar(code) : "transparent";
            const rt = t.due_at ? relative(t.due_at) : null;
            const sevColor = rt ? severityColor[rt.severity] : undefined;
            return (
              <div
                key={t.id}
                className="grid items-center gap-3 px-4 py-3 border-b border-hairline last:border-b-0 transition-colors hover:bg-surface-2 relative"
                style={
                  {
                    gridTemplateColumns: "18px auto 1fr auto auto",
                    ["--accent" as string]: accent,
                  } as CSSProperties
                }
              >
                <span
                  aria-hidden
                  className="absolute left-0 top-2 bottom-2 w-[2px] rounded-sm opacity-70"
                  style={{ background: accent }}
                />
                <button
                  type="button"
                  onClick={() => onComplete(t)}
                  disabled={pending}
                  aria-label={`Complete: ${t.title}`}
                  className={cn(
                    "w-4 h-4 rounded-[4px] border border-border-strong grid place-items-center bg-transparent cursor-pointer",
                    "hover:border-ok transition-colors",
                    "disabled:opacity-60"
                  )}
                >
                  {pending ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin text-muted" />
                  ) : null}
                </button>

                {code ? (
                  <span
                    className="course-pill"
                    style={{ ["--accent" as string]: accent } as CSSProperties}
                  >
                    <span className="course-dot" />
                    {code}
                  </span>
                ) : (
                  <span className="font-mono text-[9.5px] tracking-[0.08em] uppercase text-subtle border border-hairline rounded-[5px] px-2 py-[3px]">
                    Personal
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setEditing(t)}
                  className="min-w-0 text-left"
                >
                  <div className="text-[13px] text-fg truncate leading-[1.3]">{t.title}</div>
                  {t.priority && t.priority !== "low" && (
                    <div
                      className="font-mono text-[10.5px] tracking-[0.06em] uppercase mt-[2px]"
                      style={{ color: t.priority === "urgent" ? "var(--critical)" : "var(--subtle)" }}
                    >
                      {t.priority}
                    </div>
                  )}
                </button>

                {rt && (
                  <span
                    className="font-mono text-[11.5px] tabular-nums tracking-[0.02em]"
                    style={{ color: sevColor ?? "var(--muted)" }}
                  >
                    {rt.label}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setEditing(t)}
                  aria-label="Edit"
                  className="inline-flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-surface-2 transition-colors h-7 w-7"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {done.length > 0 && (
        <div className="px-4 pt-3 pb-3 border-t border-hairline">
          <button
            type="button"
            onClick={() => setShowDone((s) => !s)}
            className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted hover:text-fg transition-colors"
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", !showDone && "-rotate-90")}
            />
            Completed · {done.length}
          </button>
          {showDone && (
            <ul className="mt-2 flex flex-col divide-y divide-hairline">
              {done.map((t) => {
                const pending = reopen.isPending && reopen.variables === t.id;
                return (
                  <li
                    key={t.id}
                    className="py-2 flex items-start gap-3 text-sm text-muted"
                  >
                    <Check className="h-4 w-4 text-ok flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1 line-through decoration-subtle">
                      <span className="text-[13px]">{t.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onReopen(t)}
                      disabled={pending}
                      aria-label="Reopen"
                      className="h-7 w-7 rounded-md inline-flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2 transition-colors"
                    >
                      {pending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <TaskForm
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        task={editing}
        courses={courses}
      />
    </>
  );
}

function byDue(a: Task, b: Task) {
  if (!a.due_at && !b.due_at) return 0;
  if (!a.due_at) return 1;
  if (!b.due_at) return -1;
  return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
}
function byCompletedDesc(a: Task, b: Task) {
  const av = a.completed_at ? new Date(a.completed_at).getTime() : 0;
  const bv = b.completed_at ? new Date(b.completed_at).getTime() : 0;
  return bv - av;
}
