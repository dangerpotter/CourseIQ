import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the API port from environment or use a default
const apiPort = process.env.API_PORT || 3000;

export default defineConfig(({ mode }) => {
  return {
    base: "/courseiq/",
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0", // Allow external connections
      port: 5173,
      // Only use proxy in development mode, not in production
      proxy:
        mode === "development"
          ? {
              "/api": {
                target: `http://localhost:${apiPort}`,
                changeOrigin: true,
              },
            }
          : undefined,
    },
  };
});
