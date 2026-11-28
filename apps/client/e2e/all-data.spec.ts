import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { productNow } from "../src/lib/product-time";
import { login, openExploreFilters } from "./helpers";

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://localhost:8080";

function userIdFromToken(token: string): number {
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString("utf8")
  );
  return payload.userId as number;
}

// P1.6 (§11.7): abas e filtro de arquivados vivem na URL; o link "Ver
// arquivados" de /projects abre /all-data já no estado certo.
test("abas e arquivados vivem na URL", async ({ page }) => {
  await login(page);

  await page.goto("/all-data");
  await expect(
    page.getByRole("heading", { level: 1, name: "Explorar" })
  ).toBeVisible();

  await page.getByRole("tab", { name: "Projetos" }).click();
  await expect(page).toHaveURL(/tab=projects/);

  await openExploreFilters(page);

  const archivedSwitch = page.getByRole("switch", {
    name: "Mostrar arquivados",
  });
  await archivedSwitch.click();
  await expect(page).toHaveURL(/archived=1/);

  await page.reload();
  await expect(page.getByRole("tab", { name: "Projetos" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await openExploreFilters(page);
  await expect(
    page.getByRole("switch", { name: "Mostrar arquivados" })
  ).toBeChecked();

  await page.goto("/projects");
  await page.getByRole("button", { name: "Filtros" }).click();
  await page.getByRole("link", { name: "Ver arquivados" }).click();
  await expect(page).toHaveURL(/\/all-data\?tab=projects&archived=1/);
  await openExploreFilters(page);
  await expect(
    page.getByRole("switch", { name: "Mostrar arquivados" })
  ).toBeChecked();
});

// D9: o filtro de status inclui "Em andamento" com o rótulo de TASK_STATUS.
test("filtro de status inclui Em andamento", async ({ page }) => {
  await login(page);
  await page.goto("/all-data?tab=tasks");
  await openExploreFilters(page);

  const filters = page.getByRole("dialog", { name: "Filtros" });
  await filters.getByRole("button", { name: "Status" }).click();
  await expect(filters.getByRole("checkbox", { name: "Em andamento" })).toBeVisible();
});

// Em um painel estreito, Explorar usa lista, oferece filtros no Sheet
// e mantém a rolagem horizontal contida.
test("no mobile a tabela vira lista e a página não rola", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile only");

  const token = process.env.E2E_TOKEN;
  if (!token) throw new Error("E2E_TOKEN ausente — globalSetup não rodou?");
  const userId = userIdFromToken(token);
  const today = productNow().date;

  const create = await fetch(`${API_BASE_URL}/task/user/${userId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify({
      title: `Tabela mobile ${Date.now()} com um título longo para forçar rolagem`,
      description: "Tarefa criada para validar a lista no mobile",
      plannedDate: today,
      startTime: "09:00:00",
      dueDate: today,
      priority: "MEDIUM",
    }),
  });
  expect(create.ok).toBeTruthy();

  await login(page);
  await page.goto("/all-data?tab=tasks");

  await expect(page.getByRole("list", { name: "Lista de tarefas" })).toBeVisible();
  await expect(page.getByRole("table")).toBeHidden();

  const pageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(pageOverflow).toBeLessThanOrEqual(0);
});
