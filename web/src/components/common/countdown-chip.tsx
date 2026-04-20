import { relative, type RelativeSeverity } from "@/lib/time";
import { cn } from "@/lib/cn";

const styles: Record<RelativeSeverity, string> = {
  done: "bg-ok/15 text-ok",
  past: "bg-critical/15 text-critical",
  urgent: "bg-critical/15 text-critical",
  soon: "bg-warn/15 text-warn",
  later: "bg-info/15 text-info",
  far: "bg-surface-2 text-muted",
};

export function CountdownChip({
  target,
  className,
}: {
  target: string | Date;
  className?: string;
}) {
  const r = relative(target);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium font-mono tabular-nums",
        styles[r.severity],
        className
      )}
    >
      {r.label}
    </span>
  );
}
