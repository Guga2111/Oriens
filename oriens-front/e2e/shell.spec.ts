import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// SPEC §13.2 A1 / P0.2: exatamente um `h1` por rota autenticada.

const ROUTES = [
  "/tasks",
  "/projects",
  "/stats",
  "/config",
  "/financial",
  "/all-data",
  "/support",
  "/admin/support",
  "/admin/management",
];

test("cada rota autenticada tem exatamente um h1", async ({ page }, testInfo) => {
  await login(page);

  // Cria um projeto para cobrir /tasks/project/:id (rota autenticada).
  await page.goto("/projects");
  const projectName = `Projeto H1 ${Date.now()}`;
  const dialog = page.getByRole("dialog", { name: "Criar Novo Projeto" });
  await page.getByRole("button", { name: "Novo Projeto" }).click();
  await dialog.locator("#title").fill(projectName);
  await dialog.getByRole("button", { name: "Criar Projeto" }).click();
  await expect(dialog).toBeHidden();

  // O card de projeto não é link: a rota de detalhe é alcançada pelos
  // favoritos da sidebar (no mobile é preciso abrir o Sheet).
  if (testInfo.project.name === "mobile") {
    await page
      .getByRole("button", { name: /alternar menu de navegação/i })
      .first()
      .click();
  }
  const detailLink = page
    .locator('[data-sidebar="sidebar"]')
    .first()
    .getByRole("link", { name: projectName });
  await expect(detailLink).toBeVisible();
  await detailLink.click();
  await page.waitForURL(/\/tasks\/project\/\d+/);
  const detailPath = new URL(page.url()).pathname;

  for (const route of [...ROUTES, detailPath]) {
    await page.goto(route);
    await expect(
      page.locator("h1"),
      `rota ${route} deveria ter exatamente um h1`
    ).toHaveCount(1);
  }
});
