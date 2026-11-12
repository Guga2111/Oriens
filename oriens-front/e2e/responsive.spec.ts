import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// Asserts de responsividade do projeto mobile (SPEC §15 P0.0). Passam a valer
// como testes normais a partir do P0.2 (PR 1.2): shell único com SidebarTrigger.

test("mobile: /tasks não tem rolagem horizontal", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "Assert definido para o projeto mobile (SPEC §15)"
  );

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

  await login(page);

  const control = page.getByRole("button", {
    name: /alternar menu de navegação/i,
  });
  await expect(control.first()).toBeVisible();
});
