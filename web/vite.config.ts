import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // allow phone access on LAN during dev
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
      "/oauth": { target: "http://localhost:8000", changeOrigin: true },
      "/mcp": { target: "http://localhost:8000", changeOrigin: true },
      "/.well-known": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
