import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills()],
  base: "/ourvoice/",
  resolve: {
    alias: {
      buffer: "buffer",
    },
  },
  server: {
    headers: {
      "Access-Control-Allow-Origin": "http://localhost:8983",
    }
  },
});
