import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The backend runs on :8000; Vite proxies API + WebSocket traffic to it so the
// frontend can use same-origin relative URLs (no CORS juggling in the browser).
// Override with CAUSARIUM_BACKEND when another service already holds :8000.
const backend = process.env.CAUSARIUM_BACKEND || "http://localhost:8000";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy: {
      "/v1": { target: backend, changeOrigin: true, ws: true },
      "/health": { target: backend, changeOrigin: true },
    },
  },
});
