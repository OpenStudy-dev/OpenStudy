import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { QueryProvider } from "@/components/layout/query-provider";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "@/routes/dashboard";
import Courses from "@/routes/courses";
import CourseDetail from "@/routes/course-detail";
import Tasks from "@/routes/tasks";
import Deliverables from "@/routes/deliverables";
import Klausuren from "@/routes/klausuren";
import Files from "@/routes/files";
import Activity from "@/routes/activity";
import Settings from "@/routes/settings";
import Login from "@/routes/login";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "courses", element: <Courses /> },
      { path: "courses/:code", element: <CourseDetail /> },
      { path: "tasks", element: <Tasks /> },
      { path: "deliverables", element: <Deliverables /> },
      { path: "klausuren", element: <Klausuren /> },
      { path: "files", element: <Files /> },
      { path: "activity", element: <Activity /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);

export default function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
      <Toaster />
    </QueryProvider>
  );
}
