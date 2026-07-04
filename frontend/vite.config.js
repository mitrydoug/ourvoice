import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";
import { resolveAppVersion } from "../scripts/app-version.mjs";

const appVersion = process.env.VITE_APP_VERSION ?? resolveAppVersion();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills()],
  base: "./",
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
  },
  // Shared repo env dir: env/.env (+ .env.production, .env.local) is the single
  // source of frontend build config; profiles/CI override via process env.
  envDir: path.resolve(__dirname, "../env"),
  build: {
    rollupOptions: {
      output: {
        // Keep IPFS directory uploads below Pinata account file-count limits.
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: "buffer",
    },
  },
  server: {
    allowedHosts: [".my.preview.run"],
    host: true,
  },
  preview: {
    host: true,
  },
});
