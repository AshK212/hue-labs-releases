import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dev server proxies /api -> FastAPI backend so the frontend code can use
// relative URLs and we avoid CORS surprises during development.
export default defineConfig({
  plugins: [react()],
  server: {
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
