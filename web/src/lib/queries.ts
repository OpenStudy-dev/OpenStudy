import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { api } from "./api";
import type {
  AppSettings,
  Course,
  Deliverable,
  Klausur,
  Lecture,
  Slot,
  StudyTopic,
  Task,
  TaskStatus,
} from "@/data/types";

export type FallBehindSeverity = "ok" | "warn" | "critical";

export type FallBehindItem = {
  course_code: string;
  topics: StudyTopic[];
  last_covered_on: string | null;
  next_lecture_at: string | null;
  severity: FallBehindSeverity;
};

export type DashboardSummary = {
  now: string;
  courses: Course[];
  slots: Slot[];
  klausuren: Klausur[];
  deliverables: Deliverable[];
  tasks: Task[];
  study_topics: StudyTopic[];
  lectures: Lecture[];
  fall_behind: FallBehindItem[];
};

// ── Query keys ──────────────────────────────────────────────────────────────
export const qk = {
  session: ["session"] as const,
  settings: ["settings"] as const,
  dashboard: ["dashboard"] as const,
  courses: ["courses"] as const,
  course: (code: string) => ["courses", code] as const,
  slots: (course_code?: string) => ["schedule-slots", course_code ?? "all"] as const,
  klausuren: ["klausuren"] as const,
  deliverables: (course_code?: string) => ["deliverables", course_code ?? "all"] as const,
  tasks: (filters?: { course_code?: string; status?: string }) =>
    ["tasks", filters?.course_code ?? "all", filters?.status ?? "all"] as const,
  studyTopics: (course_code?: string) => ["study-topics", course_code ?? "all"] as const,
  lectures: (course_code?: string) => ["lectures", course_code ?? "all"] as const,
} satisfies Record<string, QueryKey | ((...a: never[]) => QueryKey)>;

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries();
}

// ── Session ─────────────────────────────────────────────────────────────────
export function useSession() {
  return useQuery({
    queryKey: qk.session,
    queryFn: () => api.get<{ authed: boolean }>("/api/auth/session"),
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (password: string) =>
      api.post<{ authed: boolean }>("/api/auth/login", { password }),
    onSuccess: (data) => {
      qc.setQueryData(qk.session, data);
      invalidateAll(qc);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/auth/logout"),
    onSuccess: () => qc.clear(),
  });
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export function useDashboard() {
  return useQuery({
    queryKey: qk.dashboard,
    queryFn: () => api.get<DashboardSummary>("/api/dashboard"),
    refetchOnWindowFocus: true,
  });
}

// ── Courses ────────────────────────────────────────────────────────────────
export function useCourses() {
  return useQuery({
    queryKey: qk.courses,
    queryFn: () => api.get<Course[]>("/api/courses"),
    staleTime: 5 * 60_000,
  });
}

export function useCourse(code: string) {
  return useQuery({
    queryKey: qk.course(code),
    queryFn: () => api.get<Course>(`/api/courses/${encodeURIComponent(code)}`),
    enabled: Boolean(code),
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, patch }: { code: string; patch: Partial<Course> }) =>
      api.patch<Course>(`/api/courses/${encodeURIComponent(code)}`, patch),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Course> & { code: string; full_name: string }) =>
      api.post<Course>(`/api/courses`, body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.del(`/api/courses/${encodeURIComponent(code)}`),
    onSuccess: () => invalidateAll(qc),
  });
}

// ── App settings ───────────────────────────────────────────────────────────
export function useAppSettings() {
  return useQuery({
    queryKey: qk.settings,
    queryFn: () => api.get<AppSettings>("/api/settings"),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateAppSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<AppSettings>) =>
      api.patch<AppSettings>("/api/settings", patch),
    onSuccess: (data) => {
      qc.setQueryData(qk.settings, data);
    },
  });
}

// ── Slots / Klausuren ──────────────────────────────────────────────────────
export function useSlots(course_code?: string) {
  return useQuery({
    queryKey: qk.slots(course_code),
    queryFn: () => api.get<Slot[]>("/api/schedule-slots", { course_code }),
  });
}

export function useKlausuren() {
  return useQuery({
    queryKey: qk.klausuren,
    queryFn: () => api.get<Klausur[]>("/api/klausuren"),
  });
}

export function useUpdateKlausur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, patch }: { code: string; patch: Partial<Klausur> }) =>
      api.patch<Klausur>(`/api/klausuren/${encodeURIComponent(code)}`, patch),
    onSuccess: () => invalidateAll(qc),
  });
}

// ── Deliverables ───────────────────────────────────────────────────────────
export function useDeliverables(course_code?: string) {
  return useQuery({
    queryKey: qk.deliverables(course_code),
    queryFn: () => api.get<Deliverable[]>("/api/deliverables", { course_code }),
  });
}

export type DeliverableInput = Partial<Omit<Deliverable, "id">> & {
  course_code: Deliverable["course_code"];
  name: string;
  due_at: string;
};

export function useCreateDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DeliverableInput) => api.post<Deliverable>("/api/deliverables", body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Deliverable> }) =>
      api.patch<Deliverable>(`/api/deliverables/${id}`, patch),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useMarkDeliverableSubmitted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Deliverable>(`/api/deliverables/${id}/submit`),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useReopenDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Deliverable>(`/api/deliverables/${id}/reopen`),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/deliverables/${id}`),
    onSuccess: () => invalidateAll(qc),
  });
}

// ── Study topics ───────────────────────────────────────────────────────────
export function useStudyTopics(course_code?: string) {
  return useQuery({
    queryKey: qk.studyTopics(course_code),
    queryFn: () => api.get<StudyTopic[]>("/api/study-topics", { course_code }),
  });
}

export type StudyTopicInput = Partial<Omit<StudyTopic, "id">> & {
  course_code: StudyTopic["course_code"];
  name: string;
};

export function useCreateStudyTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StudyTopicInput) => api.post<StudyTopic>("/api/study-topics", body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateStudyTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<StudyTopic> }) =>
      api.patch<StudyTopic>(`/api/study-topics/${id}`, patch),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useMarkStudied() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<StudyTopic>(`/api/study-topics/${id}/studied`),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteStudyTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/study-topics/${id}`),
    onSuccess: () => invalidateAll(qc),
  });
}

// ── Tasks ──────────────────────────────────────────────────────────────────
export function useTasks(filters?: { course_code?: string; status?: TaskStatus }) {
  return useQuery({
    queryKey: qk.tasks(filters),
    queryFn: () =>
      api.get<Task[]>("/api/tasks", {
        course_code: filters?.course_code,
        status: filters?.status,
      }),
  });
}

export type TaskInput = Partial<Omit<Task, "id">> & { title: string };

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TaskInput) => api.post<Task>("/api/tasks", body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Task> }) =>
      api.patch<Task>(`/api/tasks/${id}`, patch),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Task>(`/api/tasks/${id}/complete`),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useReopenTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Task>(`/api/tasks/${id}/reopen`),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/tasks/${id}`),
    onSuccess: () => invalidateAll(qc),
  });
}

// ── Lectures ───────────────────────────────────────────────────────────────
export function useLectures(course_code?: string) {
  return useQuery({
    queryKey: qk.lectures(course_code),
    queryFn: () => api.get<Lecture[]>("/api/lectures", { course_code }),
  });
}

export type LectureInput = Partial<Omit<Lecture, "id">> & { course_code: Lecture["course_code"] };

export function useCreateLecture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LectureInput) => api.post<Lecture>("/api/lectures", body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateLecture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Lecture> }) =>
      api.patch<Lecture>(`/api/lectures/${id}`, patch),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useToggleLectureAttended() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, attended }: { id: string; attended: boolean }) =>
      api.patch<Lecture>(`/api/lectures/${id}`, { attended }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteLecture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/lectures/${id}`),
    onSuccess: () => invalidateAll(qc),
  });
}

// ── Files ───────────────────────────────────────────────────────────────────
export type FileEntry = {
  name: string;
  path: string;
  type: "file" | "folder";
  size?: number;
  content_type?: string;
  updated_at?: string;
};

export function useFilesList(prefix: string) {
  return useQuery({
    queryKey: ["files", "list", prefix],
    queryFn: () =>
      api.get<FileEntry[]>("/api/files/list", { prefix }),
    staleTime: 60_000, // listing is cheap; refetch on focus after a min
  });
}

export function useFileSignedUrl(path: string | null) {
  return useQuery({
    queryKey: ["files", "signed-url", path],
    queryFn: () =>
      api.get<{ url: string; expires_in: number }>("/api/files/signed-url", { path: path! }),
    enabled: Boolean(path),
    // Signed URLs are valid 1 h; keep cached for 50 min so we re-mint before
    // expiry. Browser cache on the actual PDF response keeps egress low.
    staleTime: 50 * 60_000,
    gcTime: 60 * 60_000,
  });
}

export type ActivityEvent = {
  id: string;
  kind: string;
  course_code?: string;
  payload?: Record<string, unknown>;
  created_at: string;
};

export function useEvents(opts: { kind?: string; course_code?: string; limit?: number } = {}) {
  const { kind, course_code, limit = 100 } = opts;
  return useQuery({
    queryKey: ["events", kind ?? "all", course_code ?? "all", limit],
    queryFn: () =>
      api.get<ActivityEvent[]>("/api/events", {
        kind,
        course_code,
        limit,
      }),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export function useUploadFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, path }: { file: File; path: string }) => {
      const { url } = await api.post<{ url: string; token: string; path: string }>(
        "/api/files/upload-url",
        { path }
      );
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "x-upsert": "true",
        },
        body: file,
      });
      if (!res.ok) {
        throw new Error(`upload failed: ${res.status} ${res.statusText}`);
      }
      return { path };
    },
    onSuccess: () => {
      // any list at any prefix should refresh
      qc.invalidateQueries({ queryKey: ["files", "list"] });
    },
  });
}
