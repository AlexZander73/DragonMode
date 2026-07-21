import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: resolve(projectRoot, "mobile"),
  publicDir: resolve(projectRoot, "public"),
  base: "./",
  plugins: [react()],
  build: {
    outDir: resolve(projectRoot, "mobile-dist"),
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) return "react";
          if (id.includes("node_modules/lucide-react")) return "icons";
          if (id.includes("node_modules/@capacitor")) return "native";
          return undefined;
        },
      },
    },
  },
});
