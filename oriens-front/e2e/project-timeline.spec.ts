import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { addDays, addMonths, format } from "date-fns";
import { productDate, productNow } from "../src/lib/product-time";
import { login } from "./helpers";

// Task 30 (docs/plans/2026-11-18-project-timeline-design.md §7.2): the timeline flow against the real API.
const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://localhost:8080";

function session() {
  const token = process.env.E2E_TOKEN;
  if (!token) throw new Error("E2E_TOKEN ausente — globalSetup não rodou?");
  const { userId } = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  return { userId: userId as number, headers: { Authorization: `Bearer ${token}` } };
}

/** Project writes need an Idempotency-Key, and each task bumps the project version it must carry. */
async function seedTimeline(request: APIRequestContext, suffix: string, today: string) {
  const { userId, headers } = session();
  const day = (offset: number) => format(addDays(productDate(today), offset), "yyyy-MM-dd");
  const created = await request.post(`${API_BASE_URL}/project/user/${userId}`, {
    headers: { ...headers, "Idempotency-Key": randomUUID() },
    data: { title: `Timeline ${suffix}`, mode: "DEVELOPMENT", objectives: [{ title: `Entrega ${suffix}`, dueDate: day(7) }] },
  });
  expect(created.ok()).toBeTruthy();
  const project = await created.json();

  const addTask = async (title: string, dates: { plannedDate?: string; dueDate?: string }) => {
    const current = await (await request.get(`${API_BASE_URL}/project/${project.id}`, { headers })).json();
    const response = await request.post(`${API_BASE_URL}/task/user/${userId}`, {
      headers: { ...headers, "Idempotency-Key": randomUUID() },
      data: { title, projectId: project.id, projectVersion: current.version, objectiveId: project.objectives[0].id, priority: "MEDIUM", ...dates },
    });
    expect(response.ok()).toBeTruthy();
    return (await response.json()).task as { id: number; title: string };
  };

  const bar = await addTask(`Barra ${suffix}`, { plannedDate: day(-1), dueDate: day(3) });
  const milestone = await addTask(`Marco ${suffix}`, { dueDate: day(5) });
  const undated = await addTask(`Sem data ${suffix}`, {});
  return { projectId: project.id as number, bar, milestone, undated };
}

test("timeline: escala, Hoje, ‹ ›, detalhe pela barra e deep link", async ({ page, request }, testInfo) => {
  const today = productNow().date;
  // Unique titles: desktop and mobile share the account in the same run.
  const suffix = `${testInfo.project.name} ${Date.now()}`;
  const { projectId, bar, milestone, undated } = await seedTimeline(request, suffix, today);
  const barButton = page.getByRole("button", { name: new RegExp(`^${bar.title}, a fazer, planejada`) });

  await login(page);
  await page.goto(`/tasks/project/${projectId}?tab=timeline`);
  await expect(page.getByRole("tab", { name: "Timeline" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("region", { name: "Timeline do projeto" })).toBeVisible();
  await expect(barButton).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(`^${milestone.title}, a fazer, sem planejamento, prazo`) })).toBeAttached();
  await expect(page.getByRole("region", { name: /Sem data/ }).getByRole("button", { name: new RegExp(undated.title) })).toBeVisible();

  // Scale lives in the URL.
  await page.getByRole("radio", { name: "Semana", exact: true }).click();
  await expect(page).toHaveURL(/[?&]scale=week/);
  await page.getByRole("radio", { name: "Mês", exact: true }).click();
  await expect(page).toHaveURL(/[?&]scale=month/);

  // ‹ › move the anchor by half the month window (4 months); Hoje drops it.
  const later = format(addMonths(productDate(today), 4), "yyyy-MM-dd");
  await page.getByRole("button", { name: "Próximo período" }).click();
  await expect(page).toHaveURL(new RegExp(`[?&]anchor=${later}`));
  await expect(barButton).toHaveCount(0);
  await page.getByRole("button", { name: "Período anterior" }).click();
  await expect(page).toHaveURL(new RegExp(`[?&]anchor=${today}`));
  await page.getByRole("button", { name: "Hoje", exact: true }).click();
  await expect(page).not.toHaveURL(/[?&]anchor=/);
  await expect(page).toHaveURL(/[?&]scale=month/);

  // The bar opens the TaskDetailsDialog through ?task.
  await barButton.click();
  const dialog = page.getByRole("dialog", { name: bar.title });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`[?&]task=${bar.id}`));

  // A deep link keeps the dialog open across a reload.
  await page.goto(`/tasks/project/${projectId}?tab=timeline&task=${bar.id}`);
  await page.reload();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Editar/ })).toBeVisible();
});
