import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// E2E 3 da SPEC §15 (P0.0): criar e concluir uma tarefa.
test("cria e conclui uma tarefa", async ({ page }) => {
  await login(page);

  const title = `Tarefa E2E ${Date.now()}`;
  // Nome acessível evita pegar o PopoverContent (também role="dialog").
  const dialog = page.getByRole("dialog", { name: "Criar Nova Tarefa" });

  await page.getByRole("button", { name: "Nova Tarefa" }).click();
  await expect(dialog).toBeVisible();

  await dialog.locator("#title").fill(title);

  // Data: calendário (o PopoverContent é portaled para o body, fora do dialog).
  await dialog.getByRole("button", { name: /Escolha data/ }).click();
  const today = new Date().getDate();
  await page
    .locator(`button[role="gridcell"]:not(.day-outside)`)
    .filter({ hasText: new RegExp(`^${today}$`) })
    .click();

  await dialog.locator("#startTime").fill("09:00");

  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: "Média" }).click();

  const [createResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.request().method() === "POST" && r.url().includes("/task/user/")
    ),
    dialog.getByRole("button", { name: "Salvar Tarefa" }).click(),
  ]);
  expect(createResp.ok()).toBe(true);

  await expect(dialog).toBeHidden();
  await expect(page.getByText(title)).toBeVisible();

  // Concluir: o toggle do card envia PUT com status CONCLUDED e o card
  // re-renderiza riscado após o refetch.
  const card = page
    .locator("div.mb-2")
    .filter({ has: page.getByText(title) });
  const toggle = card.getByRole("button").first();

  const [putResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.request().method() === "PUT" && r.url().includes("/task/")
    ),
    toggle.click(),
  ]);
  expect(putResp.ok()).toBe(true);
  expect(putResp.request().postDataJSON()).toMatchObject({
    title,
    status: "CONCLUDED",
  });

  await expect(card.locator("p.font-medium")).toHaveClass(/line-through/);
});
