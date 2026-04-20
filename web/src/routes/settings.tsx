import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CalendarDays,
  ChevronRight,
  Database,
  Info,
  Loader2,
  LogOut,
  RefreshCw,
  User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import {
  useAppSettings,
  useDashboard,
  useLogout,
  useUpdateAppSettings,
} from "@/lib/queries";
import { fmtBerlin } from "@/lib/time";

export default function Settings() {
  const navigate = useNavigate();
  const logout = useLogout();
  const qc = useQueryClient();
  const dashboard = useDashboard();

  async function onLogout() {
    await logout.mutateAsync();
    navigate("/login", { replace: true });
  }

  async function onRefresh() {
    await qc.invalidateQueries();
    toast.success("Refreshed");
  }

  return (
    <>
      <Header title="Settings" />
      <div className="px-4 md:px-8 py-4 md:py-6 max-w-[720px] mx-auto w-full flex flex-col gap-4">
        <Section icon={<User className="h-4 w-4" />} title="Profile">
          <ProfileForm />
        </Section>

        <Section icon={<CalendarDays className="h-4 w-4" />} title="Semester">
          <SemesterForm />
          <div className="mt-4 pt-3 border-t border-border/50 text-sm text-muted font-mono tabular-nums">
            Server time ·{" "}
            {dashboard.data ? fmtBerlin(dashboard.data.now, "EEE d MMM yyyy · HH:mm") : "—"}
          </div>
        </Section>

        <Section icon={<Database className="h-4 w-4" />} title="Data">
          <p className="text-sm text-muted mb-3">
            Pull everything fresh from the backend — useful if you edited something via MCP and the
            UI hasn't caught up yet.
          </p>
          <Button onClick={onRefresh} variant="secondary">
            <RefreshCw className="h-4 w-4" /> Refresh data
          </Button>
        </Section>

        <Section icon={<Activity className="h-4 w-4" />} title="Activity">
          <p className="text-sm text-muted mb-3">
            Every sync, MCP tool call, and edit logged chronologically.
          </p>
          <Link
            to="/activity"
            className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-surface-2 hover:bg-surface-2/80 px-3 py-2 text-sm font-medium transition-colors"
          >
            Open activity log <ChevronRight className="h-4 w-4" />
          </Link>
        </Section>

        <Section icon={<Info className="h-4 w-4" />} title="About">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-muted">Frontend</dt>
            <dd className="font-mono text-xs">Vite · React 19 · Tailwind</dd>
            <dt className="text-muted">Backend</dt>
            <dd className="font-mono text-xs">FastAPI · Supabase · Python MCP</dd>
            <dt className="text-muted">Hosting</dt>
            <dd className="font-mono text-xs">Vercel (or your own)</dd>
          </dl>
        </Section>

        <Section icon={<LogOut className="h-4 w-4" />} title="Session">
          <Button onClick={onLogout} disabled={logout.isPending} variant="secondary">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </Section>
      </div>
    </>
  );
}

function ProfileForm() {
  const settings = useAppSettings();
  const update = useUpdateAppSettings();

  const [displayName, setDisplayName] = useState("");
  const [monogram, setMonogram] = useState("");
  const [institution, setInstitution] = useState("");

  useEffect(() => {
    if (settings.data) {
      setDisplayName(settings.data.display_name ?? "");
      setMonogram(settings.data.monogram ?? "");
      setInstitution(settings.data.institution ?? "");
    }
  }, [settings.data]);

  async function onSave() {
    try {
      await update.mutateAsync({
        display_name: displayName.trim() || null,
        monogram: monogram.trim() || null,
        institution: institution.trim() || null,
      });
      toast.success("Profile saved");
    } catch (e) {
      toast.error((e as Error).message || "Failed");
    }
  }

  if (settings.isPending) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted" />;
  }

  const autoMonogram = displayName.trim().charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-3">
      <Field label="Display name" hint="Shown in the sidebar and greeting.">
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
        />
      </Field>
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <Field label="Monogram" hint={`Auto: ${autoMonogram || "—"}`}>
          <Input
            value={monogram}
            onChange={(e) => setMonogram(e.target.value.slice(0, 2))}
            maxLength={2}
            placeholder={autoMonogram || "A"}
          />
        </Field>
        <Field label="Institution" hint="Shown under the date on the dashboard.">
          <Input
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="Your university"
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button onClick={onSave} disabled={update.isPending}>
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save profile"}
        </Button>
      </div>
    </div>
  );
}

function SemesterForm() {
  const settings = useAppSettings();
  const update = useUpdateAppSettings();

  const [label, setLabel] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [locale, setLocale] = useState("en-US");

  useEffect(() => {
    if (settings.data) {
      setLabel(settings.data.semester_label ?? "");
      setStart(settings.data.semester_start ?? "");
      setEnd(settings.data.semester_end ?? "");
      setTimezone(settings.data.timezone ?? "UTC");
      setLocale(settings.data.locale ?? "en-US");
    }
  }, [settings.data]);

  async function onSave() {
    try {
      await update.mutateAsync({
        semester_label: label.trim() || null,
        semester_start: start || null,
        semester_end: end || null,
        timezone: timezone.trim() || "UTC",
        locale: locale.trim() || "en-US",
      });
      toast.success("Semester saved");
    } catch (e) {
      toast.error((e as Error).message || "Failed");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="Semester label" hint="e.g. 'SoSe 2026', 'Fall 2025', 'Trimester 2'.">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Fall 2026" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date" hint="Used for the week counter.">
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="End date">
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Timezone" hint="IANA ID, e.g. 'Europe/Berlin', 'America/New_York'.">
          <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="UTC" />
        </Field>
        <Field label="Locale" hint="For date formatting, e.g. 'en-US', 'de-DE'.">
          <Input value={locale} onChange={(e) => setLocale(e.target.value)} placeholder="en-US" />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button onClick={onSave} disabled={update.isPending}>
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save semester"}
        </Button>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-4 md:p-5">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted mb-3">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
