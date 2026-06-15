import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@anf/shared": path.resolve(__dirname, "../shared/src/index.ts") },
  },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:4000" },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
  },
});
