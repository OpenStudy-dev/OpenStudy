import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-lg border border-dashed border-border/60 py-8 px-4",
        className
      )}
    >
      {icon && <div className="mb-2 text-muted">{icon}</div>}
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="text-xs text-muted mt-1 max-w-sm">{description}</p>}
    </div>
  );
}
