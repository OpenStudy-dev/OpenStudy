import { Suspense, useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { Sidebar, BottomNav } from "./sidebar";
import { TerminalSidebar } from "./terminal-sidebar";
import { ZineSidebar } from "./zine-sidebar";
import { LibrarySidebar } from "./library-sidebar";
import { SwissSidebar } from "./swiss-sidebar";
import { useAppSettings, useCourses, useSession } from "@/lib/queries";
import { applyCourseColors } from "@/lib/theme";
import { applyTheme, normalizeTheme } from "@/lib/themes";
import { useDocumentTitle, useHtmlLang } from "@/lib/document-head";

// Inner Suspense fallback for sub-route chunk loads. Hover-prefetch on
// links almost always avoids it firing at all; when it does (cold first
// visit, no hover), a tiny centered spinner keeps the chrome stable.
function RouteFallback() {
  return (
    <div className="min-h-[40dvh] flex items-center justify-center">
      <Loader2 className="h-4 w-4 animate-spin text-muted" />
    </div>
  );
}

function MainOutlet() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  );
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useSession();
  const courses = useCourses();
  const settings = useAppSettings();

  useDocumentTitle();
  useHtmlLang();

  useEffect(() => {
    const handler = () =>
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true });
    window.addEventListener("api:unauthenticated", handler);
    return () => window.removeEventListener("api:unauthenticated", handler);
  }, [navigate, location.pathname]);

  useEffect(() => {
    applyCourseColors(courses.data);
  }, [courses.data]);

  useEffect(() => {
    applyTheme(settings.data?.theme);
  }, [settings.data?.theme]);

  // Language is driven ONLY by the Profile → Language picker (stored in
  // localStorage). Changing the Date-format picker no longer touches i18n.

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

  const theme = normalizeTheme(settings.data?.theme);
  if (theme === "terminal") {
    return (
      <div className="tm-app">
        <TerminalSidebar />
        <main className="min-w-0 pb-24 md:pb-0">
          <MainOutlet />
        </main>
        <BottomNav />
      </div>
    );
  }
  if (theme === "zine") {
    return (
      <div className="z-shell">
        <ZineSidebar />
        <main className="min-w-0 pb-24 md:pb-0">
          <MainOutlet />
        </main>
        <BottomNav />
      </div>
    );
  }
  if (theme === "library") {
    return (
      <div className="l-shell">
        <LibrarySidebar />
        <main className="min-w-0 pb-24 md:pb-0">
          <MainOutlet />
        </main>
        <BottomNav />
      </div>
    );
  }
  if (theme === "swiss") {
    return (
      <div className="s-shell">
        <SwissSidebar />
        <main className="min-w-0 pb-24 md:pb-0">
          <MainOutlet />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-24 md:px-7 md:pt-6 md:pb-20">
        <MainOutlet />
      </main>
      <BottomNav />
    </div>
  );
}
