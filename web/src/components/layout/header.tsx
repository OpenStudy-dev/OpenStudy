import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import { Settings } from "lucide-react";
import { fmtBerlin, now } from "@/lib/time";
import { cn } from "@/lib/cn";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const [clock, setClock] = useState(() => fmtBerlin(now(), "EEE d MMM · HH:mm"));

  useEffect(() => {
    const t = setInterval(() => setClock(fmtBerlin(now(), "EEE d MMM · HH:mm")), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-bg border-b border-border/60 safe-top">
      <div className="flex items-center justify-between gap-4 px-4 md:px-8 py-3 md:py-4">
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-semibold tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted font-mono tabular-nums hidden md:block">{clock}</span>
          <NavLink
            to="/app/settings"
            aria-label="Settings"
            className={({ isActive }) =>
              cn(
                "md:hidden touch-target inline-flex items-center justify-center rounded-md transition-colors",
                isActive
                  ? "bg-surface-2 text-fg"
                  : "text-muted hover:text-fg hover:bg-surface-2"
              )
            }
          >
            <Settings className="h-5 w-5" />
          </NavLink>
        </div>
      </div>
    </header>
  );
}
