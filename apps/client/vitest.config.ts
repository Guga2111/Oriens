import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Reusa os aliases do vite.config.ts e o mesmo transformador de JSX.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Só unit/componente: os specs em e2e/ são do Playwright.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Fuso fixo para os testes de data (parse local de dueDate, etc).
    env: {
      TZ: "America/Sao_Paulo",
    },
  },
});
