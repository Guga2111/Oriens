import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// E2E 2 da SPEC §15 (P0.0): navegar por todos os itens da sidebar.
// A sidebar em 390 px é um Sheet fechado sem trigger até o P0.2, então a
// navegação por ela só é verificável no projeto desktop.
test("navega por todos os itens da sidebar", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Navegação pela sidebar é desktop: no mobile o Sheet chega no P0.2 (PR 1.2)"
  );

  await login(page);

  const items = [
    { name: "Home", path: "/tasks" },
    { name: "Estatisticas", path: "/stats" },
    { name: "Projetos", path: "/projects" },
    { name: "Financeiro", path: "/financial" },
    { name: "Ajuda & Suporte", path: "/support" },
    { name: "Configurações", path: "/config" },
  ];

  for (const item of items) {
    if (new URL(page.url()).pathname === item.path) continue;

    // A sidebar colapsa em ícones e expande no hover (comportamento atual).
    await page.locator('[data-sidebar="sidebar"]').hover();
    await page.getByRole("link", { name: item.name }).click();

    await page.waitForURL((url) => url.pathname === item.path);
    await expect(page).toHaveURL(new RegExp(`${item.path}$`));
    await page.waitForLoadState("domcontentloaded");
  }
});
