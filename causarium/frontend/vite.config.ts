import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The backend runs on :8000; Vite proxies API + WebSocket traffic to it so the
// frontend can use same-origin relative URLs (no CORS juggling in the browser).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy: {
      "/v1": {
        target: "http://localhost:8000",
        changeOrigin: true,
        ws: true,
      },
      "/health": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
