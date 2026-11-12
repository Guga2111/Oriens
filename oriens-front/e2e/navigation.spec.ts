import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";

// E2E 2 da SPEC §15 (P0.0): navegar por todos os itens da sidebar.
// P0.2 (PR 1.2): os itens são links do react-router (SPA, sem document
// request), o rodapé abre o menu do usuário e o mobile abre o Sheet.

const PLAN_ITEMS = [
  { name: "Hoje", path: "/tasks" },
  { name: "Projetos", path: "/projects" },
  { name: "Financeiro", path: "/financial" },
  { name: "Estatísticas", path: "/stats" },
  { name: "Todos os dados", path: "/all-data" },
];

const ACCOUNT_ITEMS = [
  { name: "Configurações", path: "/config" },
  { name: "Ajuda & Suporte", path: "/support" },
];

/** Abre a navegação: no desktop já está expandida; no mobile é um Sheet. */
async function openNavigation(page: Page, isMobile: boolean): Promise<void> {
  if (!isMobile) return;

  await page
    .getByRole("button", { name: /alternar menu de navegação/i })
    .first()
    .click();
  await expect(
    page.locator('[data-sidebar="sidebar"][data-mobile="true"]')
  ).toBeVisible();
}

test("navega por todos os itens da sidebar", async ({ page }, testInfo) => {
  const isMobile = testInfo.project.name === "mobile";

  await login(page);

  for (const item of PLAN_ITEMS) {
    if (new URL(page.url()).pathname === item.path) continue;

    await openNavigation(page, isMobile);
    await page
      .locator('[data-sidebar="sidebar"]')
      .first()
      .getByRole("link", { name: item.name })
      .click();

    await page.waitForURL((url) => url.pathname === item.path);
    await expect(page).toHaveURL(new RegExp(`${item.path}$`));
  }

  const menu = page.getByRole("menu");

  for (const item of ACCOUNT_ITEMS) {
    if (new URL(page.url()).pathname === item.path) continue;

    await openNavigation(page, isMobile);
    await page.locator('[data-sidebar="footer"] button').first().click();
    await expect(menu).toBeVisible();
    await menu.getByRole("menuitem", { name: item.name }).click();
    // Espera o menu terminar de fechar antes de reabri-lo: reabrir durante a
    // animação de saída fecha o menu imediatamente (Radix dismissable layer).
    await expect(menu).toBeHidden();

    await page.waitForURL((url) => url.pathname === item.path);
    await expect(page).toHaveURL(new RegExp(`${item.path}$`));
  }
});

// Q-T1 (SPEC §13.3): nenhuma rota faz document request ao navegar pela sidebar.
test("navega pela sidebar sem document request (Q-T1)", async ({ page }, testInfo) => {
  const isMobile = testInfo.project.name === "mobile";

  await login(page);

  const documentRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") {
      documentRequests.push(request.url());
    }
  });

  for (const item of PLAN_ITEMS) {
    if (new URL(page.url()).pathname === item.path) continue;

    await openNavigation(page, isMobile);
    await page
      .locator('[data-sidebar="sidebar"]')
      .first()
      .getByRole("link", { name: item.name })
      .click();
    await page.waitForURL((url) => url.pathname === item.path);
  }

  const menu = page.getByRole("menu");

  for (const item of ACCOUNT_ITEMS) {
    await openNavigation(page, isMobile);
    await page.locator('[data-sidebar="footer"] button').first().click();
    await expect(menu).toBeVisible();
    await menu.getByRole("menuitem", { name: item.name }).click();
    await expect(menu).toBeHidden();
    await page.waitForURL((url) => url.pathname === item.path);
  }

  expect(documentRequests).toEqual([]);
});
