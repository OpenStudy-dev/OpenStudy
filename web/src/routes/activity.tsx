import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Activity as ActivityIcon,
  AlertCircle,
  Loader2,
  Play,
  Square,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { EmptyState } from "@/components/common/empty-state";
import { useEvents, type ActivityEvent } from "@/lib/queries";
import { fmtDateTime, relative } from "@/lib/time";
import { cn } from "@/lib/cn";

const KIND_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "sync:push", label: "Push" },
  { value: "sync:pull", label: "Pull" },
  { value: "sync:watch", label: "Watch" },
];

// Low-signal events that fire on every PDF open / listing — hidden by default.
const NOISE_KINDS = new Set(["storage:sign", "storage:sign:upload"]);

export default function Activity() {
  const [kind, setKind] = useState<string>("");
  const [verbose, setVerbose] = useState(false);
  const { data, isPending, error } = useEvents({ kind: kind || undefined, limit: 200 });

  const filtered = useMemo(() => {
    if (!data) return [];
    return verbose ? data : data.filter((e) => !NOISE_KINDS.has(e.kind));
  }, [data, verbose]);
  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  return (
    <>
      <Header title="Activity" subtitle="Sync + system events" />
      <div className="px-4 md:px-8 py-4 md:py-6 max-w-[900px] mx-auto w-full flex flex-col gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-2 overflow-x-auto flex-1 min-w-0">
            {KIND_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setKind(f.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm border whitespace-nowrap transition-colors touch-target shrink-0",
                  kind === f.value
                    ? "bg-fg text-bg border-fg"
                    : "border-border/60 text-muted hover:text-fg hover:bg-surface-2"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="inline-flex items-center gap-1.5 text-xs text-muted cursor-pointer shrink-0 px-2">
            <input
              type="checkbox"
              checked={verbose}
              onChange={(e) => setVerbose(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Verbose
          </label>
        </div>

        {isPending ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ) : error ? (
          <p className="text-sm text-critical">Couldn't load activity.</p>
        ) : !filtered || filtered.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Events appear here when sync runs, files upload, or the MCP tool fires."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map(([day, events]) => (
              <section key={day}>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                  {day}
                </h2>
                <div className="card divide-y divide-border/50">
                  {events.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function EventRow({ event }: { event: ActivityEvent }) {
  const icon = iconFor(event);
  const path = (event.payload?.path as string | undefined) ?? "";
  const action = (event.payload?.action as string | undefined) ?? "";
  const reason = (event.payload?.reason as string | undefined) ?? "";
  const err = (event.payload?.error as string | undefined) ?? "";
  const size = event.payload?.size as number | undefined;

  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <span className="font-mono text-[11px] text-muted px-1.5 py-0.5 rounded bg-surface-2">
            {event.kind}
          </span>
          {action && <span className="text-xs text-muted">{action}</span>}
          {reason && <span className="text-xs text-muted">· {reason}</span>}
          {size !== undefined && (
            <span className="text-xs text-subtle">· {fmtBytes(size)}</span>
          )}
        </div>
        {path && (
          <p className="text-sm truncate mt-0.5 font-mono">{path}</p>
        )}
        {err && <p className="text-xs text-critical mt-0.5">{err}</p>}
      </div>
      <div className="text-[11px] text-muted whitespace-nowrap shrink-0 tabular-nums">
        {relative(event.created_at).label}
      </div>
    </div>
  );
}

function iconFor(event: ActivityEvent) {
  const k = event.kind;
  if (k.endsWith(":error"))
    return <AlertCircle className="h-4 w-4 text-critical" />;
  if (k.startsWith("sync:watch:start"))
    return <Play className="h-4 w-4 text-info" />;
  if (k.startsWith("sync:watch:stop"))
    return <Square className="h-4 w-4 text-muted" />;
  const action = event.payload?.action;
  if (action === "deleted" || action === "local_deleted")
    return <Trash2 className="h-4 w-4 text-critical" />;
  if (k === "sync:push" || (k === "sync:watch" && action === "uploaded"))
    return <ArrowUpToLine className="h-4 w-4 text-ok" />;
  if (k === "sync:pull")
    return <ArrowDownToLine className="h-4 w-4 text-info" />;
  if (k === "sync:watch")
    return <RefreshCw className="h-4 w-4 text-info" />;
  return <ActivityIcon className="h-4 w-4 text-muted" />;
}

function groupByDay(events: ActivityEvent[]): [string, ActivityEvent[]][] {
  const map: Record<string, ActivityEvent[]> = {};
  for (const e of events) {
    const key = fmtDateTime(e.created_at).split(",")[0]; // "Fri 17 Apr"
    (map[key] ??= []).push(e);
  }
  return Object.entries(map);
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
