import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
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
import type { CourseCode, Lecture, SlotKind } from "@/data/types";
import { useCreateLecture, useUpdateLecture } from "@/lib/queries";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lecture?: Lecture | null;
  courseCode: CourseCode;
};

export function LectureForm({ open, onOpenChange, lecture, courseCode }: Props) {
  const editing = Boolean(lecture);
  const [number, setNumber] = useState("");
  const [heldOn, setHeldOn] = useState("");
  const [kind, setKind] = useState<SlotKind>("lecture");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [attended, setAttended] = useState(false);
  const [notes, setNotes] = useState("");

  const create = useCreateLecture();
  const update = useUpdateLecture();

  useEffect(() => {
    if (open) {
      setNumber(lecture?.number != null ? String(lecture.number) : "");
      setHeldOn(lecture?.held_on ?? "");
      setKind((lecture?.kind as SlotKind) ?? "lecture");
      setTitle(lecture?.title ?? "");
      setSummary(lecture?.summary ?? "");
      setAttended(lecture?.attended ?? false);
      setNotes(lecture?.notes ?? "");
    }
  }, [open, lecture]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      course_code: courseCode,
      number: number ? Number(number) : undefined,
      held_on: heldOn || undefined,
      kind,
      title: title.trim() || undefined,
      summary: summary.trim() || undefined,
      attended,
      notes: notes.trim() || undefined,
    };
    try {
      if (editing && lecture) {
        await update.mutateAsync({ id: lecture.id, patch: payload });
        toast.success("Lecture updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Lecture created");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || "Failed");
    }
  }

  const pending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={editing ? `Edit lecture` : "New lecture"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Number" hint="e.g. 1, 2, 3…">
              <Input
                type="number"
                min="1"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </Field>
            <Field label="Held on">
              <Input
                type="date"
                value={heldOn}
                onChange={(e) => setHeldOn(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Kind">
            <Select value={kind} onValueChange={(v) => setKind(v as SlotKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lecture">Lecture</SelectItem>
                <SelectItem value="exercise">Exercise</SelectItem>
                <SelectItem value="tutorial">Tutorial</SelectItem>
                <SelectItem value="lab">Lab</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Summary">
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={attended}
              onChange={(e) => setAttended(e.target.checked)}
              className="h-4 w-4 rounded border-border/60"
            />
            Attended
          </label>
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
