import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// Asserts de responsividade do projeto mobile (SPEC §15 P0.0). Começam como
// test.fail() e passam a valer como testes normais no P0.2 (PR 1.2).

test("mobile: /tasks não tem rolagem horizontal", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "Assert definido para o projeto mobile (SPEC §15)"
  );
  // Falha esperada até o shell único do P0.2 (PR 1.2): o header de /tasks
  // estoura 390 px em ~151 px hoje.
  test.fail(true, "Overflow horizontal conhecido até o P0.2 (PR 1.2)");

  await login(page);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("mobile: existe controle visível para abrir a navegação", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "Assert definido para o projeto mobile (SPEC §15)"
  );
  // Falha esperada até o P0.2 (PR 1.2): hoje a sidebar vira Sheet fechado
  // em 390 px sem nenhum trigger visível.
  test.fail(true, "Controle de navegação (Sheet) chega no P0.2 (PR 1.2)");

  await login(page);

  const control = page.getByRole("button", {
    name: /abrir|menu|navega/i,
  });
  await expect(control.first()).toBeVisible();
});
