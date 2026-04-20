import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import type { Course } from "@/data/types";
import {
  useCreateCourse,
  useDeleteCourse,
  useUpdateCourse,
} from "@/lib/queries";
import { fallbackAccent } from "@/lib/theme";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: Course | null; // present → edit; absent → create
};

const CODE_PATTERN = /^[A-Z0-9]{1,8}$/;

export function CourseForm({ open, onOpenChange, course }: Props) {
  const editing = Boolean(course);
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [moduleCode, setModuleCode] = useState("");
  const [ects, setEcts] = useState<string>("");
  const [prof, setProf] = useState("");
  const [language, setLanguage] = useState("");
  const [colorHex, setColorHex] = useState<string>("#7aa5e8");
  const [notes, setNotes] = useState("");

  const create = useCreateCourse();
  const update = useUpdateCourse();
  const remove = useDeleteCourse();

  useEffect(() => {
    if (!open) return;
    setCode(course?.code ?? "");
    setFullName(course?.full_name ?? "");
    setModuleCode(course?.module_code ?? "");
    setEcts(course?.ects != null ? String(course.ects) : "");
    setProf(course?.prof ?? "");
    setLanguage(course?.language ?? "");
    setColorHex(course?.color_hex || fallbackAccent(course?.code ?? "NEW"));
    setNotes(course?.notes ?? "");
  }, [open, course]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    if (!editing && !CODE_PATTERN.test(trimmedCode)) {
      toast.error("Code must be 1–8 uppercase letters or digits");
      return;
    }
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    const patch = {
      full_name: fullName.trim(),
      module_code: moduleCode.trim() || undefined,
      ects: ects ? Number(ects) : undefined,
      prof: prof.trim() || undefined,
      language: language.trim() || undefined,
      color_hex: colorHex,
      notes: notes.trim() || undefined,
    };
    try {
      if (editing && course) {
        await update.mutateAsync({ code: course.code, patch });
        toast.success(`Updated ${course.code}`);
      } else {
        await create.mutateAsync({ code: trimmedCode, ...patch, full_name: fullName.trim() });
        toast.success(`Created ${trimmedCode}`);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message || "Failed");
    }
  }

  async function onDelete() {
    if (!course) return;
    if (!confirm(`Delete course ${course.code}? This removes all linked lectures, topics, deliverables, tasks, and slots.`))
      return;
    try {
      await remove.mutateAsync(course.code);
      toast.success(`Deleted ${course.code}`);
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message || "Failed");
    }
  }

  const busy = create.isPending || update.isPending || remove.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title={editing ? `Edit ${course?.code}` : "Add course"}
        description={editing ? undefined : "Code is the short identifier (2–5 chars is typical)."}
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">

          {!editing && (
            <Field label="Code" hint="Uppercase letters/digits, e.g. ASB, CS101.">
              <Input
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={8}
                placeholder="ASB"
                autoFocus
              />
            </Field>
          )}

          <Field label="Full name">
            <Input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Introduction to Automata"
            />
          </Field>

          <Field label="Accent color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="h-9 w-12 rounded cursor-pointer bg-transparent border border-border"
              />
              <Input
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="font-mono"
                placeholder="#7aa5e8"
              />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Module code" hint="Optional — your university's module ID.">
              <Input value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} placeholder="INF22" />
            </Field>
            <Field label="ECTS">
              <Input
                type="number"
                min={0}
                max={30}
                value={ects}
                onChange={(e) => setEcts(e.target.value)}
                placeholder="6"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Professor">
              <Input value={prof} onChange={(e) => setProf(e.target.value)} placeholder="Dr. Example" />
            </Field>
            <Field label="Language">
              <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="English" />
            </Field>
          </div>

          <Field label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything you want to remember about this course."
            />
          </Field>

          <div className="flex items-center justify-between gap-2 pt-2">
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onDelete}
                disabled={busy}
                className="text-critical hover:bg-critical/10"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
