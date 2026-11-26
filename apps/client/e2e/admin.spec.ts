import { expect, test } from "@playwright/test";

// P2.3 (SPEC §11.10): telas de admin com PageHeader, KpiStrip, tabelas no
// padrão §11.7 e mailto como <a href> com o assunto codificado.
//
// O teste só roda quando há uma conta ADMIN disponível no ambiente:
//   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... npm run test:e2e
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/auth");
  await page.locator("#login-email").fill(ADMIN_EMAIL ?? "");
  await page.locator("#login-password").fill(ADMIN_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/tasks");
}

test("admin: a tela de suporte usa KpiStrip e tabela com mailto real", async ({
  page,
}, testInfo) => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    "Requer uma conta ADMIN (E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD)"
  );

  await loginAsAdmin(page);
  await page.goto("/admin/support");

  await expect(
    page.getByRole("heading", { level: 1, name: "Suporte" })
  ).toBeVisible();
  await expect(page.getByText("Total de tickets")).toBeVisible();
  await expect(page.getByText("Abertos").first()).toBeVisible();

  if (testInfo.project.name === "mobile") {
    await expect(page.getByRole("list", { name: "Lista de tickets" })).toBeVisible();
  } else {
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
  }

  const mailto = page
    .getByRole("link", { name: /Responder por e-mail/ })
    .first();
  const href = await mailto.getAttribute("href");
  expect(href).toContain("mailto:");
  expect(href).toContain("subject=Re%3A");
});

test("admin: a tela de permissões mostra os papéis com badges", async ({
  page,
}, testInfo) => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    "Requer uma conta ADMIN (E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD)"
  );

  await loginAsAdmin(page);
  await page.goto("/admin/management");

  await expect(
    page.getByRole("heading", { level: 1, name: "Gerenciar permissões" })
  ).toBeVisible();
  await expect(page.getByText("Total de usuários")).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await expect(page.getByRole("list", { name: "Lista de usuários" })).toBeVisible();
  } else {
    await expect(page.getByRole("columnheader", { name: "Permissão" })).toBeVisible();
  }
});
