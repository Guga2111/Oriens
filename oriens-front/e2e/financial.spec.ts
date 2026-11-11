import { expect, test } from "@playwright/test";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { login } from "./helpers";

// Espelha o cálculo do PeriodOverviewCard (format "MMM yyyy" com 1ª maiúscula).
function periodLabel(date: Date): string {
  const label = format(date, "MMM yyyy", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// E2E 5 da SPEC §15 (P0.0): trocar de mês no Financeiro.
test("troca de mês no Financeiro atualiza o período", async ({ page }) => {
  await login(page);
  await page.goto("/financial");

  await expect(page.getByText("Saldo geral")).toBeVisible();

  const current = periodLabel(new Date());
  const previous = periodLabel(addMonths(new Date(), -1));
  await expect(page.getByText(current, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Mês anterior" }).click();
  await expect(page.getByText(previous, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Próximo mês" }).click();
  await expect(page.getByText(current, { exact: true })).toBeVisible();
});

// BE6: POST /financial/user/{id}/tags devolve 403 para conta nova.
// Marcado como fixme até o backend corrigir (SPEC §15/§18.2).
test.fixme("cria tag financeira (BE6)", async ({ page }) => {
  await login(page);
  await page.goto("/financial");

  await page.getByRole("button", { name: "Gerenciar Tags" }).click();
  const dialog = page.getByRole("dialog", { name: "Gerenciar Tags" });
  await dialog.getByRole("button", { name: "Nova Tag" }).click();

  const tagName = `Tag E2E ${Date.now()}`;
  await dialog.locator("#tag-name").fill(tagName);
  await dialog.getByRole("button", { name: "Criar", exact: true }).click();

  await expect(dialog.getByText(tagName)).toBeVisible();
});
