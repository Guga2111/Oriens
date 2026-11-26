import { defineConfig } from "@playwright/test";
import e2e from "./playwright.config";

const url = "http://127.0.0.1:4179";

export default defineConfig({
  ...e2e,
  testDir: "./e2e/visual",
  testIgnore: [],
  globalSetup: undefined,
  workers: 1,
  updateSnapshots: "none",
  outputDir: "./test-results/visual",
  reporter: [["list"], ["html", { open: "never" }]],
  expect: {
    ...e2e.expect,
    toHaveScreenshot: { animations: "disabled", caret: "hide", threshold: 0.02, maxDiffPixels: 0 },
  },
  use: {
    ...e2e.use,
    baseURL: url,
    reducedMotion: "reduce",
    serviceWorkers: "block",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4179 --strictPort --mode visual",
    url,
    env: {
      VITE_API_BASE_URL: `${url}/visual-api`,
      VITE_PUBLIC_GOOGLE_MAPS_API_KEY: "",
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: e2e.projects?.flatMap(({ name, use }) =>
    (["light", "dark"] as const).map((colorScheme) => ({
      name: `${name}-${colorScheme}`,
      use: { ...use, colorScheme, deviceScaleFactor: 1 },
    })),
  ),
});
