import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Trash2 } from "lucide-react";
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
import type { Course, Task, TaskPriority } from "@/data/types";
import { useCreateTask, useDeleteTask, useUpdateTask } from "@/lib/queries";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null; // if present → edit; else → create
  defaultCourse?: string;
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

export function TaskForm({ open, onOpenChange, task, defaultCourse, courses }: Props) {
  const editing = Boolean(task);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseCode, setCourseCode] = useState<string>("");
  const [dueAt, setDueAt] = useState<string>("");
  const [priority, setPriority] = useState<TaskPriority>("med");
  const [tags, setTags] = useState("");

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setCourseCode(task?.course_code ?? defaultCourse ?? "");
      setDueAt(toLocalInput(task?.due_at));
      setPriority(task?.priority ?? "med");
      setTags((task?.tags ?? []).join(", "));
    }
  }, [open, task, defaultCourse]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      course_code: courseCode ? (courseCode as Task["course_code"]) : undefined,
      due_at: fromLocalInput(dueAt),
      priority,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean) || undefined,
    };
    try {
      if (editing && task) {
        await updateTask.mutateAsync({ id: task.id, patch: payload });
        toast.success("Task updated");
      } else {
        await createTask.mutateAsync(payload);
        toast.success("Task created");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || "Failed to save");
    }
  }

  async function onDelete() {
    if (!task) return;
    if (!confirm("Delete this task?")) return;
    try {
      await deleteTask.mutateAsync(task.id);
      toast.success("Task deleted");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || "Failed to delete");
    }
  }

  const pending = createTask.isPending || updateTask.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={editing ? "Edit task" : "New task"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </Field>

          <Field label="Description (optional)">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Course">
              <Select value={courseCode || "__none__"} onValueChange={(v) => setCourseCode(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} · {c.short_name ?? c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Priority">
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="med">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Due" hint="Local time; leave empty if no hard deadline.">
            <Input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </Field>

          <Field label="Tags (comma separated)">
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Blatt, admin"
            />
          </Field>

          <div className="flex items-center justify-between gap-2 pt-2">
            {editing ? (
              <Button type="button" variant="danger" size="md" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !title.trim()}>
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
