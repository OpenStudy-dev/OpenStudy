import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Floating action button — bottom right of the page.
 *
 * On mobile, sits above the bottom nav. On desktop, floats against the
 * viewport edge.
 */
export function Fab({
  onClick,
  label,
  icon,
  className,
}: {
  onClick: () => void;
  label: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "fixed right-5 z-30",
        // Above mobile bottom nav on phones; against edge on desktop
        "bottom-[calc(env(safe-area-inset-bottom)+80px)] md:bottom-6",
        "h-12 w-12 rounded-full grid place-items-center",
        "bg-fg text-bg shadow-[0_8px_24px_oklch(0_0_0_/_0.4),0_2px_6px_oklch(0_0_0_/_0.25)]",
        "hover:scale-[1.04] active:scale-[0.97] transition-transform",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        className
      )}
    >
      {icon ?? <Plus className="h-5 w-5" strokeWidth={2.25} />}
    </button>
  );
}
