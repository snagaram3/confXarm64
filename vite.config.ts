import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  appType: "spa",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 43180,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:43181",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 43180,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:43181",
        changeOrigin: true,
      },
    },
  },
});
