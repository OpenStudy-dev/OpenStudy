#!/usr/bin/env node
// Build the static, landing-only openstudy.dev site into web/dist-landing/.
//
//   cd web && pnpm build:landing
//
// Only the landing page is routed (VITE_LANDING_ONLY), nothing calls an
// API, and the Cloudflare _headers file is copied in. Override the site
// URL/name via env for a fork. Deploy (Workers Static Assets) with:
//
//   pnpm dlx wrangler@4.151.1 deploy -c deploy/cloudflare/wrangler.jsonc
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "..", "web");
const OUT = join(WEB, "dist-landing");

const env = {
  ...process.env,
  VITE_LANDING_ONLY: "true",
  VITE_SHOW_LANDING: "true",
  VITE_API_BASE_URL: "",
  VITE_SITE_URL: process.env.VITE_SITE_URL || "https://openstudy.dev",
  VITE_SITE_NAME: process.env.VITE_SITE_NAME || "OpenStudy",
};

const run = (cmd, args) =>
  execFileSync(cmd, args, { cwd: WEB, env, stdio: "inherit", shell: process.platform === "win32" });

rmSync(OUT, { recursive: true, force: true });
run("node", ["../scripts/build-seo.mjs"]);
run("pnpm", ["exec", "tsc", "-b"]);
run("pnpm", ["exec", "vite", "build", "--outDir", "dist-landing", "--emptyOutDir"]);

const headers = join(WEB, "deploy", "cloudflare", "_headers");
if (!existsSync(headers)) throw new Error(`missing ${headers}`);
copyFileSync(headers, join(OUT, "_headers"));
console.log(`[build-landing] ${OUT} ready (SITE_URL=${env.VITE_SITE_URL})`);
