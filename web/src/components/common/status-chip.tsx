import { cn } from "@/lib/cn";

type StatusKind =
  | "open"
  | "in_progress"
  | "studied"
  | "mastered"
  | "struggling"
  | "not_started"
  | "upcoming"
  | "submitted"
  | "graded"
  | "done"
  | "skipped"
  | "blocked"
  | "planned"
  | "confirmed";

const labels: Record<StatusKind, string> = {
  open: "Open",
  in_progress: "In progress",
  studied: "Studied",
  mastered: "Mastered",
  struggling: "Struggling",
  not_started: "Not started",
  upcoming: "Upcoming",
  submitted: "Submitted",
  graded: "Graded",
  done: "Done",
  skipped: "Skipped",
  blocked: "Blocked",
  planned: "Planned",
  confirmed: "Confirmed",
};

const styles: Record<StatusKind, string> = {
  open: "bg-surface-2 text-muted",
  not_started: "bg-warn/15 text-warn",
  upcoming: "bg-surface-2 text-subtle border border-border/50",
  in_progress: "bg-info/15 text-info",
  studied: "bg-ok/15 text-ok",
  mastered: "bg-ok/20 text-ok",
  struggling: "bg-critical/15 text-critical",
  submitted: "bg-ok/15 text-ok",
  graded: "bg-ok/20 text-ok",
  done: "bg-ok/15 text-ok",
  skipped: "bg-surface-2 text-subtle line-through",
  blocked: "bg-critical/15 text-critical",
  planned: "bg-surface-2 text-muted",
  confirmed: "bg-ok/15 text-ok",
};

export function StatusChip({ status, className }: { status: StatusKind; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide whitespace-nowrap shrink-0",
        styles[status],
        className
      )}
    >
      {labels[status]}
    </span>
  );
}
