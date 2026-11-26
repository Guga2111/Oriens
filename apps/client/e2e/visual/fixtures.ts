import { fileURLToPath } from "node:url";
import type { Page, Route } from "@playwright/test";
import type { UserPreferences, Theme } from "../../src/types/settings";
import type { DayResponse, PlanningCount } from "../../src/types/work";

const now = new Date("2026-11-25T15:00:00Z");
const date = "2026-11-25";
const timezone = "America/Recife";
const payload = Buffer.from(JSON.stringify({
  sub: "visual@oriens.test",
  userId: 1,
  username: "Conta visual",
  role: "USER",
  exp: now.getTime() / 1000 + 3600,
})).toString("base64url");
// This token is decoded by the client. All API requests terminate in fixtures.
const token = `eyJhbGciOiJub25lIn0.${payload}.visual`;

export async function prepareVisualPage(page: Page, theme: Theme, authenticated = false) {
  await page.clock.setFixedTime(now);
  await page.addInitScript(({ theme, session }) => {
    localStorage.setItem("oriens-theme", theme);
    if (session) localStorage.setItem("authToken", session);
  }, { theme, session: authenticated ? token : null });

  const api = new Map<string, unknown>([
    ["/user/1", { profileImageUrl: null, phoneNumber: null }],
    ["/user/1/preferences", { theme, notifications: false, sound: false } satisfies UserPreferences],
    ["/project/user/1/sidebar", []],
    ["/project/user/1", { content: [], totalElements: 0, totalPages: 0 }],
    ["/task/user/1", { date, timezone, planned: [], previousPlans: [], deadlineAttention: [], completed: [] } satisfies DayResponse],
    ["/task/user/1/planning-count", { date, activeCount: 0, completedCount: 0 } satisfies PlanningCount],
    ["/task-labels/user/1", []],
    ["/notifications/user/1/last-notifications", []],
  ]);

  const unexpected: string[] = [];
  async function routeVisualRequest(route: Route) {
    const { origin, hostname, pathname } = new URL(route.request().url());
    if (hostname === "fonts.googleapis.com" && pathname === "/css2") {
      return route.fulfill({
        contentType: "text/css",
        body: "@font-face { font-family: Inter; font-weight: 100 900; src: url('https://fonts.gstatic.com/inter-latin.woff2') format('woff2'); }",
      });
    }
    if (hostname === "fonts.gstatic.com" && pathname === "/inter-latin.woff2") {
      return route.fulfill({
        path: fileURLToPath(new URL("./fixtures/inter-latin.woff2", import.meta.url)),
        headers: { "access-control-allow-origin": "*" },
        contentType: "font/woff2",
      });
    }
    if (origin === "http://127.0.0.1:4179") {
      if (!pathname.startsWith("/visual-api/")) return route.continue();
      const endpoint = pathname.slice("/visual-api".length);
      if (route.request().method() === "GET" && api.has(endpoint)) {
        return route.fulfill({ json: api.get(endpoint) });
      }
    }
    unexpected.push(`${route.request().method()} ${origin}${pathname}`);
    return route.abort();
  }

  await page.route("**/*", routeVisualRequest);
  return unexpected;
}
