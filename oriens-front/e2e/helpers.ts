import { expect, type Page } from "@playwright/test";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} ausente — o globalSetup do Playwright não rodou?`);
  }
  return value;
}

/** Faz login pela UI e espera o Dashboard (Dia) carregar. */
export async function login(page: Page): Promise<void> {
  await page.goto("/auth");
  await page.locator("#login-email").fill(requireEnv("E2E_EMAIL"));
  await page.locator("#login-password").fill(requireEnv("E2E_PASSWORD"));
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/tasks");
  await expect(page.getByRole("heading", { level: 2, name: "Manhã" })).toBeVisible();
}

/**
 * Abaixo de 768 px os filtros ficam dentro de um Sheet (SPEC §11.7/P2.0). No
 * desktop os filtros já estão na página e a função não faz nada.
 */
export async function openFiltersSheet(page: Page): Promise<void> {
  const trigger = page.getByRole("button", { name: /Filtros/ }).first();
  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click();
    await expect(page.getByRole("heading", { name: "Filtros" })).toBeVisible();
  }
}
