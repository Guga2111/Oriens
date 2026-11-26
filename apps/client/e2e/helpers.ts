import { expect, type Page } from "@playwright/test";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} ausente — o globalSetup do Playwright não rodou?`);
  }
  return value;
}

/** Faz login pela UI e espera o Dashboard (Dia) carregar. */
export async function login(page: Page, credentials?: { email: string; password: string }): Promise<void> {
  await page.goto("/auth");
  await page.locator("#login-email").fill(credentials?.email ?? requireEnv("E2E_EMAIL"));
  await page.locator("#login-password").fill(credentials?.password ?? requireEnv("E2E_PASSWORD"));
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/tasks");
  await expect(page.getByRole("heading", { level: 2, name: "Manhã" })).toBeVisible();
}

/** Explorar usa Popover no desktop e Sheet em telas estreitas. */
export async function openExploreFilters(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Filtros/ }).click();
  await expect(page.getByRole("heading", { name: "Filtros" })).toBeVisible();
}
