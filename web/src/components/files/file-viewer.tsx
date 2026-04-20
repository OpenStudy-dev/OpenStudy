import { useEffect, useState } from "react";
import { ExternalLink, FileText, Loader2, X } from "lucide-react";
import { useFileSignedUrl } from "@/lib/queries";
import { cn } from "@/lib/cn";

function useIsMobile() {
  const [is, setIs] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  );
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const h = () => setIs(mql.matches);
    mql.addEventListener("change", h);
    return () => mql.removeEventListener("change", h);
  }, []);
  return is;
}

/** Full-screen modal preview for a single file. PDFs render inline via iframe,
 *  markdown/text as preformatted text, everything else gets a download link. */
export function FileViewer({ path, onClose }: { path: string; onClose: () => void }) {
  const { data, isPending, error } = useFileSignedUrl(path);
  const name = path.split("/").pop() || path;
  const ext = name.toLowerCase().split(".").pop() || "";

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/80 animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <div
        className="flex items-center gap-2 px-4 py-3 border-b border-border/60 bg-surface safe-top"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-[11px] text-muted truncate">{path}</p>
        </div>
        {data?.url && (
          <a
            href={data.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open in new tab"
            className="touch-target inline-flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-surface-2 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="touch-target inline-flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-surface-2 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="flex-1 min-h-0 bg-bg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {isPending && (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        )}
        {error && (
          <div className="h-full flex items-center justify-center p-6">
            <p className="text-sm text-critical">Couldn't load file.</p>
          </div>
        )}
        {data?.url && !isPending && !error && (
          <FileContent url={data.url} ext={ext} name={name} />
        )}
      </div>
    </div>
  );
}

function FileContent({ url, ext, name }: { url: string; ext: string; name: string }) {
  const isMobile = useIsMobile();

  if (ext === "pdf") {
    // iOS Safari disables scrolling inside iframed PDFs. Bounce mobile users
    // into the OS's native PDF viewer (new tab) where pinch/scroll/page nav
    // all work. Desktop browsers handle inline iframes fine.
    if (isMobile) {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
          <FileText className="h-12 w-12 text-muted" />
          <p className="text-sm text-muted max-w-xs">
            Mobile browsers don't let PDFs scroll inside an in-app viewer. Tap below to open in your
            browser's native viewer — you'll get proper pinch-zoom and page nav there.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-fg text-sm font-medium px-5 py-3 touch-target"
          >
            <ExternalLink className="h-4 w-4" /> Open {name}
          </a>
        </div>
      );
    }
    return (
      <iframe
        src={url}
        title={name}
        className="w-full h-full border-0"
      />
    );
  }
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
    return (
      <div className="h-full flex items-center justify-center p-4 overflow-auto">
        <img src={url} alt={name} className={cn("max-w-full max-h-full object-contain")} />
      </div>
    );
  }
  if (["md", "txt", "typ", "csv", "json"].includes(ext)) {
    return <TextContent url={url} />;
  }
  // Unknown type — offer a download link
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm text-muted">No inline viewer for `.{ext}` files.</p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-fg text-sm font-medium px-4 py-2 hover:bg-primary/90 transition-colors"
      >
        <ExternalLink className="h-4 w-4" /> Open in new tab
      </a>
    </div>
  );
}

function TextContent({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${r.status}`))))
      .then((t) => alive && setText(t))
      .catch((e) => alive && setErr(String(e)));
    return () => {
      alive = false;
    };
  }, [url]);
  if (err) return <p className="p-6 text-sm text-critical">Fetch failed: {err}</p>;
  if (text === null)
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  return (
    <pre className="h-full w-full overflow-auto p-4 md:p-6 text-[13px] leading-relaxed whitespace-pre-wrap font-mono text-fg">
      {text}
    </pre>
  );
}
