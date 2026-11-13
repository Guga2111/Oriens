import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// E2E 4 da SPEC §15 (P0.0): criar um projeto com objetivo e alternar o objetivo.
test("cria projeto com objetivo e alterna o objetivo", async ({ page }) => {
  await login(page);
  await page.goto("/projects");

  const projectName = `Projeto E2E ${Date.now()}`;
  // Título único: desktop e mobile compartilham a conta no mesmo run.
  const objectiveTitle = `Objetivo E2E ${Date.now()}`;
  const dialog = page.getByRole("dialog", { name: "Criar Novo Projeto" });

  await page.getByRole("button", { name: "Novo projeto" }).click();
  await expect(dialog).toBeVisible();

  await dialog.locator("#title").fill(projectName);
  await dialog.getByPlaceholder("Objetivo 1").fill(objectiveTitle);

  const [createResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.request().method() === "POST" && r.url().includes("/project/user/")
    ),
    dialog.getByRole("button", { name: "Criar Projeto" }).click(),
  ]);
  expect(createResp.ok()).toBe(true);

  await expect(dialog).toBeHidden();
  const main = page.locator("main");
  await expect(main.getByText(projectName)).toBeVisible();

  // Card sem imagem: alterna o objetivo pelo rótulo acessível.
  const card = main.locator("div.rounded-lg").filter({
    has: page.getByText(projectName),
  });
  const objectiveToggle = card.getByRole("button", {
    name: `Concluir objetivo: ${objectiveTitle}`,
  });

  const [patchResp] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.request().method() === "PATCH" &&
        /\/objective\/\d+$/.test(r.url())
    ),
    objectiveToggle.click(),
  ]);
  expect(patchResp.ok()).toBe(true);

  // O card só lista pendentes; ao concluir, o objetivo sai e a contagem muda.
  await expect(card.getByText("1 de 1 objetivo")).toBeVisible();
  await expect(card.getByText(objectiveTitle)).toBeHidden();
});
