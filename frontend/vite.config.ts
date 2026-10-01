import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Where the Express API runs. In docker-compose (bridge network) this is http://backend:3001.
const apiTarget = process.env.API_PROXY_TARGET || "http://localhost:3001";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: { "/api": { target: apiTarget, changeOrigin: true } },
  },
  build: { chunkSizeWarningLimit: 1500 },
  preview: { port: 5173, proxy: { "/api": { target: apiTarget, changeOrigin: true } } },
});
