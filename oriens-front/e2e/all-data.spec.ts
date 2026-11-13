import { Buffer } from "node:buffer";
import { expect, test } from "@playwright/test";
import { format } from "date-fns";
import { login, openFiltersSheet } from "./helpers";

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
    page.getByRole("heading", { level: 1, name: "Todos os dados" })
  ).toBeVisible();

  await page.getByRole("tab", { name: "Projetos" }).click();
  await expect(page).toHaveURL(/tab=projects/);

  await openFiltersSheet(page);

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
  await openFiltersSheet(page);
  await expect(
    page.getByRole("switch", { name: "Mostrar arquivados" })
  ).toBeChecked();

  await page.goto("/projects");
  await page.getByRole("link", { name: "Ver arquivados" }).click();
  await expect(page).toHaveURL(/\/all-data\?tab=projects&archived=1/);
  await openFiltersSheet(page);
  await expect(
    page.getByRole("switch", { name: "Mostrar arquivados" })
  ).toBeChecked();
});

// D9: o filtro de status inclui "Em andamento" com o rótulo de TASK_STATUS.
test("filtro de status inclui Em andamento", async ({ page }) => {
  await login(page);
  await page.goto("/all-data?tab=tasks");
  await openFiltersSheet(page);

  await page.getByRole("combobox", { name: "Status" }).click();
  await expect(
    page.getByRole("option", { name: "Em andamento" })
  ).toBeVisible();
});

// §11.7 (P2.0): abaixo de 768 a tabela vira lista de 2 linhas e os filtros
// ficam dentro de um Sheet; a página não rola na horizontal.
test("no mobile a tabela vira lista e a página não rola", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile only");

  const token = process.env.E2E_TOKEN;
  if (!token) throw new Error("E2E_TOKEN ausente — globalSetup não rodou?");
  const userId = userIdFromToken(token);

  const create = await fetch(`${API_BASE_URL}/task/user/${userId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `Tabela mobile ${Date.now()} com um título longo para forçar rolagem`,
      description: "Tarefa criada para validar a lista no mobile",
      startTime: "09:00",
      dueDate: format(new Date(), "yyyy-MM-dd"),
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
