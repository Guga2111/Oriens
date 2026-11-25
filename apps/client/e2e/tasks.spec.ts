import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// P1.1: concluir, marcar em andamento e voltar para a fazer (D9).
test("cria, conclui e alterna o status de uma tarefa", async ({ page }) => {
  await login(page);

  const title = `Tarefa E2E ${Date.now()}`;
  // Nome acessível evita pegar o PopoverContent (também role="dialog").
  const dialog = page.getByRole("dialog", { name: "Criar Nova Tarefa" });

  await page.getByRole("button", { name: "Nova Tarefa" }).click();
  await expect(dialog).toBeVisible();

  await dialog.locator("#title").fill(title);
  await dialog.locator("#startTime").fill("09:00");

  // A data já vem preenchida com o dia visível (P1.1).
  await expect(
    dialog.getByRole("button", { name: "Data", exact: true })
  ).toHaveText(/\d{2}\/\d{2}\/\d{4}/);

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

  const row = page.getByRole("listitem").filter({ hasText: title });
  await expect(row).toBeVisible();

  // Concluir: PENDING → CONCLUDED.
  const [concludeResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.request().method() === "PUT" && r.url().includes("/task/")
    ),
    row.getByRole("checkbox", { name: `Concluir ${title}` }).click(),
  ]);
  expect(concludeResp.ok()).toBe(true);
  expect(concludeResp.request().postDataJSON()).toMatchObject({
    title,
    status: "CONCLUDED",
  });
  await expect(row.getByText(title, { exact: true })).toHaveClass(
    /line-through/
  );

  // Recarrega para sair de qualquer refetch em andamento antes do menu.
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 2, name: "Manhã" })
  ).toBeVisible();
  let currentRow = page.getByRole("listitem").filter({ hasText: title });
  await expect(currentRow.getByText(title, { exact: true })).toHaveClass(
    /line-through/
  );

  // Voltar para a fazer: CONCLUDED → PENDING.
  await currentRow
    .getByRole("button", { name: `Ações da tarefa ${title}` })
    .click();
  const [reopenResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.request().method() === "PUT" && r.url().includes("/task/")
    ),
    page.getByRole("menuitem", { name: "Voltar para a fazer" }).click(),
  ]);
  expect(reopenResp.ok()).toBe(true);
  expect(reopenResp.request().postDataJSON()).toMatchObject({
    title,
    status: "PENDING",
  });
  await expect(currentRow.getByText(title, { exact: true })).not.toHaveClass(
    /line-through/
  );

  await page.reload();
  await expect(
    page.getByRole("heading", { level: 2, name: "Manhã" })
  ).toBeVisible();
  currentRow = page.getByRole("listitem").filter({ hasText: title });

  // Marcar como em andamento: PENDING → ON_DOING.
  await currentRow
    .getByRole("button", { name: `Ações da tarefa ${title}` })
    .click();
  const [doingResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.request().method() === "PUT" && r.url().includes("/task/")
    ),
    page.getByRole("menuitem", { name: "Marcar como em andamento" }).click(),
  ]);
  expect(doingResp.ok()).toBe(true);
  expect(doingResp.request().postDataJSON()).toMatchObject({
    title,
    status: "ON_DOING",
  });
  await expect(
    currentRow.getByText("Em andamento", { exact: true })
  ).toBeVisible();
  await expect(
    currentRow.getByRole("checkbox", {
      name: `Concluir ${title} (em andamento)`,
    })
  ).toHaveAttribute("aria-checked", "mixed");

  // ON_DOING persiste após recarregar.
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 2, name: "Manhã" })
  ).toBeVisible();
  currentRow = page.getByRole("listitem").filter({ hasText: title });
  await expect(
    currentRow.getByText("Em andamento", { exact: true })
  ).toBeVisible();

  // E volta para a fazer pelo menu.
  await currentRow
    .getByRole("button", { name: `Ações da tarefa ${title}` })
    .click();
  const [backResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.request().method() === "PUT" && r.url().includes("/task/")
    ),
    page.getByRole("menuitem", { name: "Voltar para a fazer" }).click(),
  ]);
  expect(backResp.ok()).toBe(true);
  await expect(
    currentRow.getByText("Em andamento", { exact: true })
  ).toBeHidden();
});
