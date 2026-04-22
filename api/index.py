"""Vercel Python entrypoint. Imports the FastAPI app from ../app/main.py.

Layout:
  OpenStudy/
    api/index.py          (this file — Vercel serverless function)
    app/main.py           (the actual FastAPI app)
    requirements.txt
"""
import os
import sys

# Make repo root importable so `app.main` resolves.
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from app.main import app  # noqa: E402

# Vercel looks for a callable named `app` (ASGI).
__all__ = ["app"]
