import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dev server proxies /api -> FastAPI backend so the frontend code can use
// relative URLs and we avoid CORS surprises during development.
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to all network interfaces so the app is reachable via the machine's
    // IP address (e.g. http://192.168.x.x:5173), not just localhost. Vite prints
    // the Network URL on startup.
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
