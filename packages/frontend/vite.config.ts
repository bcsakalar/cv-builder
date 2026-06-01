import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Hosts allowed to reach the dev server. The backend's headless-Chrome PDF
// renderer loads the /print page via the internal docker hostname
// (app-frontend), which Vite's DNS-rebinding protection blocks by default.
// Override with VITE_ALLOWED_HOSTS (comma-separated) if the host differs.
const allowedHosts = process.env.VITE_ALLOWED_HOSTS
  ? process.env.VITE_ALLOWED_HOSTS.split(",").map((host) => host.trim()).filter(Boolean)
  : ["localhost", "127.0.0.1", "app-frontend"];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    setupFiles: "./src/test/setup.ts",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    allowedHosts,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
