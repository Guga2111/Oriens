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
  await expect(page.getByRole("heading", { level: 3, name: "Manhã" })).toBeVisible();
}
