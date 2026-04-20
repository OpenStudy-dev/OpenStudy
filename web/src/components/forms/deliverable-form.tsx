import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Course,
  CourseCode,
  Deliverable,
  DeliverableKind,
  DeliverableStatus,
} from "@/data/types";
import {
  useCreateDeliverable,
  useDeleteDeliverable,
  useUpdateDeliverable,
} from "@/lib/queries";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliverable?: Deliverable | null;
  defaultCourse?: CourseCode;
  courses: Course[];
};

function toLocalInput(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(local: string): string | undefined {
  if (!local) return undefined;
  return new Date(local).toISOString();
}

export function DeliverableForm({
  open,
  onOpenChange,
  deliverable,
  defaultCourse,
  courses,
}: Props) {
  const editing = Boolean(deliverable);
  const [name, setName] = useState("");
  const [courseCode, setCourseCode] = useState<string>("");
  const [kind, setKind] = useState<DeliverableKind | "">("");
  const [availableAt, setAvailableAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [status, setStatus] = useState<DeliverableStatus>("open");
  const [localPath, setLocalPath] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [weightInfo, setWeightInfo] = useState("");
  const [notes, setNotes] = useState("");

  const create = useCreateDeliverable();
  const update = useUpdateDeliverable();
  const del = useDeleteDeliverable();

  useEffect(() => {
    if (open) {
      setName(deliverable?.name ?? "");
      setCourseCode(deliverable?.course_code ?? defaultCourse ?? "");
      setKind((deliverable?.kind as DeliverableKind) ?? "");
      setAvailableAt(toLocalInput(deliverable?.available_at));
      setDueAt(toLocalInput(deliverable?.due_at));
      setStatus(deliverable?.status ?? "open");
      setLocalPath(deliverable?.local_path ?? "");
      setExternalUrl(deliverable?.external_url ?? "");
      setWeightInfo(deliverable?.weight_info ?? "");
      setNotes(deliverable?.notes ?? "");
    }
  }, [open, deliverable, defaultCourse]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !courseCode || !dueAt) return;
    const payload = {
      course_code: courseCode as CourseCode,
      name: name.trim(),
      kind: (kind || undefined) as DeliverableKind | undefined,
      available_at: fromLocalInput(availableAt),
      due_at: fromLocalInput(dueAt)!,
      status,
      local_path: localPath.trim() || undefined,
      external_url: externalUrl.trim() || undefined,
      weight_info: weightInfo.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    try {
      if (editing && deliverable) {
        await update.mutateAsync({ id: deliverable.id, patch: payload });
        toast.success("Deliverable updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Deliverable created");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || "Failed");
    }
  }

  async function onDelete() {
    if (!deliverable) return;
    if (!confirm("Delete this deliverable?")) return;
    try {
      await del.mutateAsync(deliverable.id);
      toast.success("Deliverable deleted");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || "Failed");
    }
  }

  const pending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={editing ? "Edit deliverable" : "New deliverable"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Course">
              <Select value={courseCode} onValueChange={setCourseCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Kind">
              <Select value={kind || "__none__"} onValueChange={(v) => setKind(v === "__none__" ? "" : (v as DeliverableKind))}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  <SelectItem value="abgabe">Abgabe</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="praktikum">Praktikum</SelectItem>
                  <SelectItem value="block">Block / admin</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Available at">
              <Input
                type="datetime-local"
                value={availableAt}
                onChange={(e) => setAvailableAt(e.target.value)}
              />
            </Field>
            <Field label="Due at">
              <Input
                type="datetime-local"
                required
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Status">
            <Select value={status} onValueChange={(v) => setStatus(v as DeliverableStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="graded">Graded</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Local path">
            <Input value={localPath} onChange={(e) => setLocalPath(e.target.value)} />
          </Field>
          <Field label="External URL">
            <Input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} />
          </Field>
          <Field label="Weight info">
            <Input value={weightInfo} onChange={(e) => setWeightInfo(e.target.value)} />
          </Field>
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          <div className="flex items-center justify-between gap-2 pt-2">
            {editing ? (
              <Button type="button" variant="danger" size="md" onClick={onDelete}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !name.trim() || !courseCode || !dueAt}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
