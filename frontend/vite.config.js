import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills()],
  base: "./",
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
