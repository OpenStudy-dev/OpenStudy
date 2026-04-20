import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Loader2, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { TaskInbox } from "@/components/dashboard/task-inbox";
import { StatusChip } from "@/components/common/status-chip";
import { CourseBadge } from "@/components/common/course-accent";
import { CountdownChip } from "@/components/common/countdown-chip";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/common/fab";
import { DeliverableForm } from "@/components/forms/deliverable-form";
import { TaskForm } from "@/components/forms/task-form";
import {
  useCourses,
  useDeliverables,
  useMarkDeliverableSubmitted,
  useReopenDeliverable,
  useTasks,
} from "@/lib/queries";
import { fmtDateTime } from "@/lib/time";
import { cn } from "@/lib/cn";
import type { Deliverable } from "@/data/types";

type Tab = "tasks" | "deliverables";

export default function Tasks({ initialTab = "tasks" }: { initialTab?: Tab }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(initialTab);
  const tasks = useTasks();
  const deliverables = useDeliverables();
  const courses = useCourses();
  const [creatingTask, setCreatingTask] = useState(false);
  const [creatingDel, setCreatingDel] = useState(false);

  function switchTab(next: Tab) {
    setTab(next);
    navigate(next === "tasks" ? "/tasks" : "/deliverables", { replace: true });
  }

  const subtitle =
    tab === "tasks"
      ? tasks.data
        ? `${tasks.data.length} tasks · ${deliverables.data?.length ?? 0} deliverables`
        : undefined
      : deliverables.data
      ? `${deliverables.data.filter((d) => d.status === "open" || d.status === "in_progress").length} open · ${deliverables.data.filter((d) => d.status === "submitted" || d.status === "graded").length} submitted`
      : undefined;

  return (
    <>
      <Header title={tab === "tasks" ? "Tasks" : "Deliverables"} subtitle={subtitle} />
      <div className="px-4 md:px-8 py-4 md:py-6 max-w-[900px] mx-auto w-full flex flex-col gap-4">
        <div className="border-b border-border/60">
          <div className="flex">
            {(["tasks", "deliverables"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => switchTab(k)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium touch-target border-b-2 transition-colors capitalize",
                  tab === k
                    ? "border-fg text-fg"
                    : "border-transparent text-muted hover:text-fg"
                )}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {tab === "tasks" ? (
          <TasksPanel
            loading={tasks.isPending || courses.isPending}
            error={tasks.error}
            hasData={Boolean(tasks.data)}
          >
            {tasks.data && (
              <TaskInbox tasks={tasks.data} courses={courses.data ?? []} />
            )}
          </TasksPanel>
        ) : (
          <DeliverablesPanel
            loading={deliverables.isPending || courses.isPending}
            error={deliverables.error}
            hasData={Boolean(deliverables.data)}
          >
            {deliverables.data && (
              <DeliverablesContent
                items={deliverables.data}
                coursesCount={courses.data?.length ?? 0}
              />
            )}
          </DeliverablesPanel>
        )}
      </div>

      <TaskForm
        open={creatingTask}
        onOpenChange={setCreatingTask}
        courses={courses.data ?? []}
      />
      <DeliverableForm
        open={creatingDel}
        onOpenChange={setCreatingDel}
        courses={courses.data ?? []}
      />
      <Fab
        onClick={() => (tab === "tasks" ? setCreatingTask(true) : setCreatingDel(true))}
        label={tab === "tasks" ? "New task" : "New deliverable"}
      />
    </>
  );
}

// ─── Panels (just loading/error/empty shells) ──────────────────────────────

function TasksPanel({
  loading,
  error,
  hasData,
  children,
}: {
  loading: boolean;
  error: unknown;
  hasData: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        </div>
      ) : error || !hasData ? (
        <p className="text-sm text-critical">Couldn't load tasks.</p>
      ) : (
        children
      )}
    </div>
  );
}

function DeliverablesPanel({
  loading,
  error,
  hasData,
  children,
}: {
  loading: boolean;
  error: unknown;
  hasData: boolean;
  children?: React.ReactNode;
}) {
  return (
    <>
      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        </div>
      ) : error || !hasData ? (
        <p className="text-sm text-critical">Couldn't load deliverables.</p>
      ) : (
        children
      )}
    </>
  );
}

// ─── Deliverables inline view (formerly /deliverables route) ───────────────

function DeliverablesContent({
  items,
  coursesCount,
}: {
  items: Deliverable[];
  coursesCount: number;
}) {
  const submit = useMarkDeliverableSubmitted();
  const reopen = useReopenDeliverable();
  const [editing, setEditing] = useState<Deliverable | null>(null);
  void coursesCount; // reserved — DeliverableForm is opened via editing below

  async function onSubmit(d: Deliverable) {
    try {
      await submit.mutateAsync(d.id);
      toast.success(`Submitted: ${d.name}`, {
        action: {
          label: "Undo",
          onClick: async () => {
            await reopen.mutateAsync(d.id);
            toast.success("Restored");
          },
        },
      });
    } catch (e) {
      toast.error((e as Error).message || "Failed");
    }
  }

  async function onReopenClick(d: Deliverable) {
    await reopen.mutateAsync(d.id);
    toast.success("Reopened");
  }

  const open = items.filter((d) => d.status === "open" || d.status === "in_progress");
  const sorted = [...items].sort(
    (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
  );

  return (
    <div className="flex flex-col gap-4">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">Open</h2>
        <div className="card p-4">
          {open.length === 0 ? (
            <p className="text-sm text-muted">Nothing open.</p>
          ) : (
            <DeliverableList
              items={open}
              onEdit={setEditing}
              onSubmit={onSubmit}
              onReopen={onReopenClick}
            />
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">All</h2>
        <div className="card p-4">
          <DeliverableList
            items={sorted}
            onEdit={setEditing}
            onSubmit={onSubmit}
            onReopen={onReopenClick}
          />
        </div>
      </section>

      <DeliverableForm
        open={Boolean(editing)}
        onOpenChange={(o) => !o && setEditing(null)}
        deliverable={editing}
        courses={[]}
      />
    </div>
  );
}

function DeliverableList({
  items,
  onEdit,
  onSubmit,
  onReopen,
}: {
  items: Deliverable[];
  onEdit: (d: Deliverable) => void;
  onSubmit: (d: Deliverable) => void;
  onReopen: (d: Deliverable) => void;
}) {
  return (
    <ul className="divide-y divide-border/50">
      {items.map((d) => (
        <li key={d.id} className="py-3 flex flex-wrap items-start gap-2 first:pt-0 last:pb-0">
          <CourseBadge code={d.course_code} />
          <button
            type="button"
            onClick={() => onEdit(d)}
            className="min-w-0 flex-1 text-left"
          >
            <p className="text-sm font-medium">{d.name}</p>
            <p className="text-xs text-muted mt-0.5">{fmtDateTime(d.due_at)}</p>
          </button>
          <div className="flex items-center gap-1">
            <StatusChip status={d.status} />
            <CountdownChip target={d.due_at} />
            {d.external_url && (
              <a
                href={d.external_url}
                target="_blank"
                rel="noreferrer"
                aria-label="Open external"
                className="touch-target inline-flex items-center justify-center rounded-md text-muted hover:text-fg"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {(d.status === "open" || d.status === "in_progress") && (
              <Button variant="secondary" size="sm" onClick={() => onSubmit(d)}>
                Submit
              </Button>
            )}
            {d.status === "submitted" && (
              <Button variant="ghost" size="sm" onClick={() => onReopen(d)}>
                <RotateCcw className="h-3.5 w-3.5" /> Reopen
              </Button>
            )}
            <button
              type="button"
              onClick={() => onEdit(d)}
              aria-label="Edit"
              className="touch-target inline-flex items-center justify-center rounded-md text-muted hover:text-fg"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
