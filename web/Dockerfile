# OpenStudy frontend — multi-stage build.
# Stage 1 builds the Vite SPA with Node + pnpm. Stage 2 serves the built
# `dist/` from a tiny Caddy image that also reverse-proxies API traffic
# to the openstudy backend container on the internal docker network.

# ─── Stage 1: build ────────────────────────────────────────────────────────
FROM node:20-alpine AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@latest --activate

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
FROM caddy:2-alpine

# Static SPA bundle.
COPY --from=build /repo/web/dist /srv

# Internal Caddyfile: serves the SPA, proxies API/MCP/OAuth to the backend.
COPY web/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
