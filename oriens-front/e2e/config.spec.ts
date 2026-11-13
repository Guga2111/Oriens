import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// P2.1 (SPEC §11.8): seções de Configurações, tema por ToggleGroup e o
// WhatsApp mostrando apenas o estado (BE1 ainda não existe).
test("configurações tem as quatro seções e o tema em ToggleGroup", async ({
  page,
}) => {
  await login(page);
  await page.goto("/config");

  await expect(
    page.getByRole("heading", { level: 1, name: "Configurações" })
  ).toBeVisible();

  for (const section of [
    "Aparência",
    "Notificações e som",
    "Integrações",
    "Conta",
  ]) {
    await expect(
      page.getByRole("heading", { level: 2, name: section })
    ).toBeVisible();
  }

  await expect(page.getByRole("radio", { name: "Claro" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Escuro" })).toBeVisible();
});

test("WhatsApp mostra apenas o estado, sem botão de conexão", async ({
  page,
}) => {
  await login(page);
  await page.goto("/config");

  await expect(page.getByText("Não conectado")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Conectar|Desconectar|Alterar/ })
  ).toHaveCount(0);
});

test("o tema alterna entre claro e escuro", async ({ page }) => {
  await login(page);
  await page.goto("/config");

  await page.getByRole("radio", { name: "Escuro" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.getByRole("radio", { name: "Claro" }).click();
  await expect(page.locator("html")).toHaveClass(/light/);
});
