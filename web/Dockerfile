# OpenStudy frontend — multi-stage build.
# Stage 1 builds the Vite SPA with Node + pnpm. Stage 2 serves the built
# `dist/` from a tiny Caddy image that also reverse-proxies API traffic
# to the openstudy backend container on the internal docker network.

# ─── Stage 1: build ────────────────────────────────────────────────────────
# Pinned to version + digest (see the backend Dockerfile). Node 24.22.1
# carries the fix for CVE-2026-111497 (Node2Shell).
FROM node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# Same pnpm as package.json#packageManager — never `latest`.
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /repo

# Install deps first for better layer caching.
COPY web/package.json web/pnpm-lock.yaml ./web/
RUN cd web && pnpm install --frozen-lockfile

# Build-time env — set at compose build time via build.args.
# All defaults are deliberately conservative so a fork doesn't accidentally
# build with someone else's domain baked in. Set PUBLIC_SITE_URL in your
# .env.docker (or shell env) to your own domain for production.
ARG VITE_API_BASE_URL=
ARG VITE_SITE_URL=http://localhost:8080
ARG VITE_SITE_NAME=OpenStudy
ARG VITE_SHOW_LANDING=false
ARG VITE_GOOGLE_SITE_VERIFICATION=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_SITE_URL=$VITE_SITE_URL \
    VITE_SITE_NAME=$VITE_SITE_NAME \
    VITE_SHOW_LANDING=$VITE_SHOW_LANDING \
    VITE_GOOGLE_SITE_VERIFICATION=$VITE_GOOGLE_SITE_VERIFICATION

# Copy the rest. web/ has the SPA source; scripts/build-seo.mjs lives one
# level up and is invoked from web/'s prebuild.
COPY web ./web
COPY scripts ./scripts
RUN cd web && pnpm build

# ─── Stage 2: serve ────────────────────────────────────────────────────────
FROM caddy:2.11.7-alpine@sha256:eb4d35b7452d1ab6171fbdbe8d9275b2301dad6dad92115d91e19fb9b24d510f

# The 2026-10-21 caddy image still ships brotli-libs 1.2.0 (needed by
# libcurl). Caddy itself is a static Go binary and doesn't link it, but
# take the CVE-2026-111497 (Node2Shell) fix anyway. Drop this line once the
# pinned base digest carries brotli-libs >= 1.2.1.
RUN apk add --no-cache --upgrade 'brotli-libs>=1.2.1'

# Static SPA bundle.
COPY --from=build /repo/web/dist /srv

# Internal Caddyfile: serves the SPA, proxies API/MCP/OAuth to the backend.
COPY web/Caddyfile /etc/caddy/Caddyfile

# Unprivileged runtime user; Caddy listens on :8080 so it needs no caps.
# The upstream binary carries cap_net_bind_service as a file capability;
# with cap_drop: [ALL] the kernel refuses to exec a binary whose file caps
# it can't grant, so strip it. /data and /config are tmpfs at runtime.
RUN apk add --no-cache --virtual .setcap libcap-utils     && setcap -r /usr/bin/caddy     && apk del .setcap     && addgroup -S -g 10001 web && adduser -S -D -H -u 10001 -G web web
USER web

EXPOSE 8080
