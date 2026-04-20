import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Sidebar, BottomNav } from "./sidebar";
import { useCourses, useSession } from "@/lib/queries";
import { applyCourseColors } from "@/lib/theme";

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useSession();
  const courses = useCourses();

  useEffect(() => {
    const handler = () =>
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true });
    window.addEventListener("api:unauthenticated", handler);
    return () => window.removeEventListener("api:unauthenticated", handler);
  }, [navigate, location.pathname]);

  useEffect(() => {
    applyCourseColors(courses.data);
  }, [courses.data]);

  if (session.isPending) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  if (!session.data?.authed) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return (
    <div className="min-h-[100dvh] flex">
      <Sidebar />
      <main className="flex-1 min-w-0 pt-5 pb-24 safe-top md:px-7 md:pt-6 md:pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
