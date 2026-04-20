"""Sync the local Semester 4/ folder with the Supabase course_files bucket.

Three subcommands:

    uv run python scripts/sync.py push          # laptop -> bucket (upserts)
    uv run python scripts/sync.py pull          # bucket -> laptop (creates/updates)
    uv run python scripts/sync.py watch         # daemon: watch local FS + periodic pull

Add --mirror to push/pull to also delete entries missing on the other side.
Every action is logged to the `events` table so it shows up on the dashboard.

Requires the `scripts` uv dep group:
    uv sync --group scripts
"""
from __future__ import annotations

import argparse
import mimetypes
import os
import sys
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Optional

# Make repo root importable so `app.*` resolves.
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from app.db import supabase
from app.services import storage as storage_svc


_STUDY_ROOT = os.environ.get("STUDY_ROOT")
if not _STUDY_ROOT:
    raise SystemExit(
        "STUDY_ROOT is not set. Point it at the local directory that mirrors your "
        "course files bucket, e.g. `export STUDY_ROOT=\"$HOME/study\"` (or set it in .env)."
    )
SOURCE_DIR = Path(_STUDY_ROOT).expanduser()

SKIP_DIRS = {".git", ".venv", "node_modules", "__pycache__", ".claude", ".vscode", "target"}
SKIP_FILES = {".DS_Store", "Thumbs.db"}
SKIP_SUFFIXES = {".pyc", ".log", ".swp"}

POLL_INTERVAL_SEC = 180  # how often watch pulls from the bucket


# ─────────────────────────── helpers ───────────────────────────

_UMLAUT_MAP = str.maketrans({
    "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss",
    "Ä": "Ae", "Ö": "Oe", "Ü": "Ue",
})


def sanitize_key(rel: str) -> str:
    s = rel.translate(_UMLAUT_MAP)
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    return s


def should_skip(p: Path) -> bool:
    if p.name in SKIP_FILES:
        return True
    if p.suffix in SKIP_SUFFIXES:
        return True
    for part in p.parts:
        if part in SKIP_DIRS:
            return True
    return False


def guess_content_type(p: Path) -> str:
    ct, _ = mimetypes.guess_type(p.name)
    if ct:
        return ct
    if p.suffix.lower() == ".typ":
        return "text/plain; charset=utf-8"
    if p.suffix.lower() == ".ipynb":
        return "application/x-ipynb+json"
    return "application/octet-stream"


def iter_local_files() -> Iterable[Path]:
    for root, dirs, files in os.walk(SOURCE_DIR):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in files:
            p = Path(root) / name
            if not should_skip(p):
                yield p


def iter_bucket_entries(prefix: str = "") -> Iterable[dict[str, Any]]:
    """Recursive traversal — Supabase's list is flat per prefix."""
    entries = storage_svc.list_files(prefix=prefix, limit=1000)
    for e in entries:
        name = e.get("name") or ""
        if not name:
            continue
        path = f"{prefix}/{name}" if prefix else name
        if e.get("id") is None:
            yield from iter_bucket_entries(path)
        else:
            e["__path"] = path
            yield e


def log_event(kind: str, payload: dict[str, Any]) -> None:
    try:
        supabase().table("events").insert(
            {"kind": kind, "payload": payload}
        ).execute()
    except Exception as exc:  # non-fatal — don't break sync on logging failure
        print(f"  ! event log failed: {exc}", file=sys.stderr)


def _parse_ts(v: str) -> datetime:
    return datetime.fromisoformat(v.replace("Z", "+00:00"))


# ─────────────────────────── push ───────────────────────────

def cmd_push(mirror: bool = False, quiet: bool = False) -> int:
    if not SOURCE_DIR.is_dir():
        print(f"source not found: {SOURCE_DIR}", file=sys.stderr)
        return 1

    local_keys: set[str] = set()
    uploaded = 0
    failed = 0

    for local in iter_local_files():
        rel = local.relative_to(SOURCE_DIR).as_posix()
        key = sanitize_key(rel)
        local_keys.add(key)
        try:
            data = local.read_bytes()
            storage_svc.upload(key, data, guess_content_type(local))
            if not quiet:
                print(f"  PUSH {key} ({len(data):,} B)")
            log_event("sync:push", {"path": key, "size": len(data), "action": "uploaded"})
            uploaded += 1
        except Exception as exc:
            print(f"  ! FAILED {key}: {exc}", file=sys.stderr)
            log_event("sync:push:error", {"path": key, "error": str(exc)})
            failed += 1

    deleted = 0
    if mirror:
        for e in iter_bucket_entries():
            path = e["__path"]
            if path not in local_keys:
                try:
                    storage_svc.delete([path])
                    if not quiet:
                        print(f"  DELETE {path} (missing locally)")
                    log_event("sync:push", {"path": path, "action": "deleted"})
                    deleted += 1
                except Exception as exc:
                    print(f"  ! delete failed {path}: {exc}", file=sys.stderr)

    print(f"\nPush done. uploaded={uploaded} deleted={deleted} failed={failed}")
    return 0 if failed == 0 else 2


# ─────────────────────────── pull ───────────────────────────

def cmd_pull(mirror: bool = False, quiet: bool = False) -> int:
    if not SOURCE_DIR.exists():
        SOURCE_DIR.mkdir(parents=True, exist_ok=True)

    downloaded = 0
    skipped = 0
    failed = 0
    bucket_paths: set[str] = set()

    for e in iter_bucket_entries():
        path = e["__path"]
        bucket_paths.add(path)
        local = SOURCE_DIR / path
        meta = e.get("metadata") or {}
        bucket_size = int(meta.get("size") or 0)
        bucket_ts = _parse_ts(e.get("updated_at") or e.get("created_at") or "1970-01-01T00:00:00Z")

        should_write = True
        if local.exists():
            local_size = local.stat().st_size
            local_ts = datetime.fromtimestamp(local.stat().st_mtime, tz=timezone.utc)
            if local_size == bucket_size and local_ts >= bucket_ts:
                skipped += 1
                should_write = False

        if should_write:
            try:
                data = storage_svc.download(path)
                local.parent.mkdir(parents=True, exist_ok=True)
                local.write_bytes(data)
                if not quiet:
                    print(f"  PULL {path} ({len(data):,} B)")
                log_event("sync:pull", {"path": path, "size": len(data), "action": "downloaded"})
                downloaded += 1
            except Exception as exc:
                print(f"  ! FAILED {path}: {exc}", file=sys.stderr)
                log_event("sync:pull:error", {"path": path, "error": str(exc)})
                failed += 1

    local_deleted = 0
    if mirror:
        # Delete anything locally that isn't in the bucket.
        for local in iter_local_files():
            rel = local.relative_to(SOURCE_DIR).as_posix()
            key = sanitize_key(rel)
            if key not in bucket_paths:
                try:
                    local.unlink()
                    if not quiet:
                        print(f"  DELETE-LOCAL {rel} (missing in bucket)")
                    log_event("sync:pull", {"path": rel, "action": "local_deleted"})
                    local_deleted += 1
                except Exception as exc:
                    print(f"  ! local delete failed {rel}: {exc}", file=sys.stderr)

    print(
        f"\nPull done. downloaded={downloaded} skipped={skipped} "
        f"local_deleted={local_deleted} failed={failed}"
    )
    return 0 if failed == 0 else 2


# ─────────────────────────── watch ───────────────────────────

def cmd_watch() -> int:
    try:
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler
    except ImportError:
        print(
            "watchdog not installed. run: uv sync --group scripts",
            file=sys.stderr,
        )
        return 1

    class Handler(FileSystemEventHandler):
        def _key_for(self, event_path: str) -> Optional[str]:
            try:
                rel = Path(event_path).resolve().relative_to(SOURCE_DIR.resolve()).as_posix()
            except ValueError:
                return None
            if should_skip(Path(rel)):
                return None
            return sanitize_key(rel)

        def _push_one(self, local_path: str, key: str, reason: str) -> None:
            try:
                data = Path(local_path).read_bytes()
                storage_svc.upload(key, data, guess_content_type(Path(local_path)))
                print(f"  PUSH {key} ({reason}, {len(data):,} B)")
                log_event(
                    "sync:watch", {"path": key, "size": len(data), "action": "uploaded", "reason": reason}
                )
            except Exception as exc:
                print(f"  ! upload failed {key}: {exc}", file=sys.stderr)
                log_event("sync:watch:error", {"path": key, "error": str(exc)})

        def on_created(self, event):
            if event.is_directory:
                return
            key = self._key_for(event.src_path)
            if key is None:
                return
            self._push_one(event.src_path, key, "created")

        def on_modified(self, event):
            if event.is_directory:
                return
            key = self._key_for(event.src_path)
            if key is None:
                return
            self._push_one(event.src_path, key, "modified")

        def on_deleted(self, event):
            if event.is_directory:
                return
            key = self._key_for(event.src_path)
            if key is None:
                return
            try:
                storage_svc.delete([key])
                print(f"  DELETE {key} (deleted locally)")
                log_event("sync:watch", {"path": key, "action": "deleted"})
            except Exception as exc:
                print(f"  ! delete failed {key}: {exc}", file=sys.stderr)
                log_event("sync:watch:error", {"path": key, "error": str(exc)})

        def on_moved(self, event):
            if event.is_directory:
                return
            old_key = self._key_for(event.src_path)
            new_key = self._key_for(event.dest_path)
            if old_key:
                try:
                    storage_svc.delete([old_key])
                except Exception:
                    pass
            if new_key:
                self._push_one(event.dest_path, new_key, "moved")

    print(f"Watching {SOURCE_DIR} — push on change, pull every {POLL_INTERVAL_SEC}s.")
    log_event("sync:watch:start", {"source": str(SOURCE_DIR), "poll_interval_sec": POLL_INTERVAL_SEC})

    observer = Observer()
    observer.schedule(Handler(), str(SOURCE_DIR), recursive=True)
    observer.start()

    last_pull = 0.0
    try:
        while True:
            now = time.time()
            if now - last_pull >= POLL_INTERVAL_SEC:
                print(f"  [pull] periodic pull ({datetime.now().strftime('%H:%M:%S')})")
                try:
                    cmd_pull(mirror=False, quiet=True)
                except Exception as exc:
                    print(f"  ! periodic pull failed: {exc}", file=sys.stderr)
                last_pull = now
            time.sleep(1.0)
    except KeyboardInterrupt:
        print("\nStopping watcher…")
        log_event("sync:watch:stop", {})
    finally:
        observer.stop()
        observer.join()
    return 0


# ─────────────────────────── CLI wiring ───────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(prog="sync", description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p_push = sub.add_parser("push", help="laptop -> bucket")
    p_push.add_argument("--mirror", action="store_true", help="also delete bucket files missing locally")
    p_push.add_argument("--quiet", action="store_true")

    p_pull = sub.add_parser("pull", help="bucket -> laptop")
    p_pull.add_argument("--mirror", action="store_true", help="also delete local files missing in bucket")
    p_pull.add_argument("--quiet", action="store_true")

    sub.add_parser("watch", help="daemon: push on local change + periodic pull")

    args = ap.parse_args()
    if args.cmd == "push":
        sys.exit(cmd_push(mirror=args.mirror, quiet=args.quiet))
    elif args.cmd == "pull":
        sys.exit(cmd_pull(mirror=args.mirror, quiet=args.quiet))
    elif args.cmd == "watch":
        sys.exit(cmd_watch())


if __name__ == "__main__":
    main()
