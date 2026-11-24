import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { login } from "./helpers";

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://localhost:8080";

/** Creates a task planned for today through the API, as the account the global setup made. */
async function createTodayTask(title: string) {
  const auth = await fetch(`${API_BASE_URL}/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }),
  });
  const text = await auth.text();
  const body = text ? JSON.parse(text) : {};
  const token = (auth.headers.get("authorization") ?? "").split(" ")[1] || body.token;
  const userId = body.userId ?? body.id ?? JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).userId;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date());
  const created = await fetch(`${API_BASE_URL}/task/user/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "Idempotency-Key": randomUUID() },
    body: JSON.stringify({ title, plannedDate: today, priority: "MEDIUM" }),
  });
  expect(created.ok).toBe(true);
}

// The whole row opens the panel (a press transform once shrank the stretched target mid-click),
// and a click outside the panel closes it and clears ?task.
test("abre o painel pela linha da tarefa e fecha ao clicar fora", async ({ page }, testInfo) => {
  // Desktop and mobile share the account and run in parallel, so the title must be unique per run.
  const title = `Painel E2E ${testInfo.project.name} ${randomUUID().slice(0, 8)}`;
  await createTodayTask(title);
  await login(page);

  const row = page.getByRole("listitem").filter({ hasText: title });
  // "Sem horário" comes after the day's periods, below the fold on a phone; a raw mouse click does not scroll.
  await row.scrollIntoViewIfNeeded();
  const box = (await row.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.6, box.y + 20);

  const panel = page.getByRole("dialog", { name: title });
  await expect(panel).toBeVisible();
  await expect(page).toHaveURL(/task=\d+/);

  await page.getByRole("heading", { level: 1 }).click();
  await expect(panel).toBeHidden();
  await expect(page).not.toHaveURL(/task=/);
});
