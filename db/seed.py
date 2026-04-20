"""Seed Supabase with an empty baseline.

Run:
  cp .env.example .env    # fill SUPABASE_* values first
  uv run python -m db.seed

The only thing this does is make sure the `app_settings` singleton row exists —
everything else (courses, schedule, lectures, topics, deliverables, tasks,
klausuren) is created by you from inside the app. If you want to see the app
pre-populated, run the example seed instead:

  uv run python -m db.seed_example
"""
from __future__ import annotations

import os
import sys

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from app.db import supabase  # noqa: E402


def main() -> None:
    client = supabase()
    # Idempotent: ensure the single app_settings row exists so the UI can read it.
    client.table("app_settings").upsert({"id": 1}).execute()
    print("[ok] app_settings row ensured. Add your courses from inside the app.")


if __name__ == "__main__":
    main()
