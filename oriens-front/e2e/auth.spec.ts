import { expect, test } from "@playwright/test";

// E2E 1 da SPEC §15 (P0.0): login.
test("login com credenciais válidas leva ao Dashboard", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error("E2E_EMAIL/E2E_PASSWORD ausentes — globalSetup não rodou?");
  }

  await page.goto("/auth");

  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await page.waitForURL("**/tasks");
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByRole("heading", { level: 2, name: "Manhã" })).toBeVisible();
});
