import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "ok" | "warn" | "critical";

export function MetricTile({
  label,
  value,
  unit,
  hint,
  icon,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: string;
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const toneColor =
    tone === "warn" ? "var(--warn)" :
    tone === "critical" ? "var(--critical)" :
    tone === "ok" ? "var(--ok)" :
    "var(--border)";

  const bgStyle: CSSProperties =
    tone === "warn"
      ? { background: "color-mix(in oklch, var(--warn) 5%, var(--surface))", borderColor: "color-mix(in oklch, var(--warn) 22%, var(--border))" }
      : tone === "critical"
      ? { background: "color-mix(in oklch, var(--critical) 7%, var(--surface))", borderColor: "color-mix(in oklch, var(--critical) 28%, var(--border))" }
      : tone === "ok"
      ? { background: "color-mix(in oklch, var(--ok) 4%, var(--surface))" }
      : {};

  const iconColor =
    tone === "warn" ? "var(--warn)" :
    tone === "critical" ? "var(--critical)" :
    tone === "ok" ? "var(--ok)" :
    "var(--muted)";

  return (
    <div
      className={cn(
        "card relative overflow-hidden flex flex-col gap-2.5 transition-colors",
        "px-4 pt-3.5 pb-4",
        className
      )}
      style={bgStyle}
    >
      <span
        aria-hidden
        className="absolute left-0 top-2.5 bottom-2.5 w-[2px] rounded-sm"
        style={{ background: toneColor }}
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          {label}
        </span>
        {icon && (
          <span className="h-4 w-4 shrink-0 inline-flex items-center justify-center" style={{ color: iconColor }}>
            {icon}
          </span>
        )}
      </div>

      <div
        className="font-serif text-[38px] leading-none tracking-[-0.01em] text-fg flex items-baseline gap-1.5"
        style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30' }}
      >
        <span>{value}</span>
        {unit && (
          <span className="font-mono text-[12px] text-muted tracking-normal font-normal">
            {unit}
          </span>
        )}
      </div>

      {hint && (
        <div
          className="text-[12.5px]"
          style={{
            color:
              tone === "critical"
                ? "color-mix(in oklch, var(--critical) 40%, var(--fg-dim))"
                : "var(--muted)",
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
