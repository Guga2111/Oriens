import { expect, test, type Page } from "@playwright/test";
import { registerTestAccount } from "./global-setup";
import { login } from "./helpers";

test.use({ reducedMotion: "reduce" });

async function openFinancePage(page: Page, name: string) {
  const toggle = page.getByRole("button", { name: "Alternar menu de navegação" });
  const mobile = await toggle.isVisible();
  if (mobile) await toggle.click();
  await page.getByRole("navigation", { name: "Menu de Financeiro" })
    .getByRole("link", { name, exact: true }).click();
  if (mobile) {
    await expect(page.getByRole("dialog", { name: "Navegação Oriens", includeHidden: true })).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  }
}

function historyRow(page: Page, description: string) {
  return page.getByRole("row").or(
    page.getByRole("list", { name: "Lista de entradas" }).getByRole("listitem")
  ).filter({ has: page.getByText(description, { exact: true }) });
}

async function expectNoHorizontalScroll(page: Page) {
  const dimensions = await page.locator("html").evaluate(root => {
    const elements = [root, ...root.querySelectorAll("main, [data-page-content], [role=dialog]")];
    return elements.map(element => element.scrollWidth - element.clientWidth);
  });
  expect(Math.max(...dimensions)).toBeLessThanOrEqual(1);
}

async function expectCash(page: Page, receipts: string, expenses: string, result: string, balance: string) {
  const summary = page.getByRole("region", { name: "Resumo do mês" });
  for (const [label, value] of Object.entries({
    Receitas: receipts,
    Despesas: expenses,
    "Resultado do mês": result,
    "Saldo disponível": balance,
  })) {
    await expect(summary.getByText(label, { exact: true }).locator("xpath=following-sibling::dd[1]"))
      .toHaveText(value);
  }
}

function investmentButton(page: Page, name: string) {
  return page.getByRole("button", { name: new RegExp(`^${name},`) });
}

async function createInvestment(page: Page, name: string, value: string) {
  await page.getByRole("button", { name: "Nova aplicação", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Nova aplicação" });
  await dialog.getByRole("textbox", { name: "Nome da aplicação" }).fill(name);
  await dialog.getByRole("textbox", { name: "Valor atual" }).fill(value);
  await dialog.getByRole("button", { name: "Salvar aplicação" }).click();
  await expect(dialog).toBeHidden();
  await expect(investmentButton(page, name)).toBeVisible();
}

async function checkPosition(page: Page, name: string, amount: string, state: "avaliada" | "estimada") {
  const investment = investmentButton(page, name);
  await expect(investment.getByText(amount, { exact: true })).toBeVisible();
  await expect(investment).toHaveAccessibleName(new RegExp(`, ${state}\\.`));
}

async function registerMovement(page: Page, investment: string, kind: string, amount: string, description: string) {
  await investmentButton(page, investment).click();
  const detail = page.getByRole("dialog", { name: investment, exact: true });
  await detail.getByRole("button", { name: "Registrar movimento" }).click();
  const dialog = page.getByRole("dialog", { name: "Registrar movimento" });
  await dialog.getByRole("radio", { name: kind, exact: true }).check();
  await dialog.getByRole("textbox", { name: "Valor", exact: true }).fill(amount);
  await dialog.getByRole("textbox", { name: "Descrição (opcional)" }).fill(description);
  await dialog.getByRole("button", { name: "Salvar movimento" }).click();
  await expect(dialog).toBeHidden();
  await expect(detail.getByRole("listitem").filter({ hasText: description })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(detail).toBeHidden();
}

async function createEntry(page: Page, amount: string, tag: string, description: string, recurring = false) {
  await page.getByRole("button", { name: "Nova entrada", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Nova Entrada", exact: true });
  await dialog.getByLabel("Valor", { exact: true }).fill(amount);
  await dialog.getByRole("combobox", { name: "Tag" }).click();
  await page.getByRole("option", { name: tag, exact: true }).click();
  await dialog.getByRole("textbox", { name: "Descrição" }).fill(description);
  if (recurring) {
    await dialog.getByRole("checkbox", { name: "Esta é uma entrada recorrente" }).check();
    await dialog.getByRole("combobox", { name: "Padrão de recorrência" }).click();
    await page.getByRole("option", { name: "Mensal", exact: true }).click();
  }
  await dialog.getByRole("button", { name: "Criar Entrada" }).click();
  await expect(dialog).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await login(page, await registerTestAccount());
});

test("rendimento de R$ 100 entra uma vez no caixa e a avaliação atualiza a posição", async ({ page }) => {
  await page.goto("/financial");
  await expectCash(page, "R$ 0,00", "R$ 0,00", "R$ 0,00", "R$ 0,00");
  await openFinancePage(page, "Investimentos");
  await createInvestment(page, "CDB Sintético", "1000");
  await checkPosition(page, "CDB Sintético", "R$ 1.000,00", "avaliada");

  await openFinancePage(page, "Lançamentos");
  await expect(page.getByText("Nenhuma entrada", { exact: true })).toBeVisible();
  await openFinancePage(page, "Investimentos");

  await registerMovement(page, "CDB Sintético", "Rendimento recebido", "100", "Dividendo sintético");
  await checkPosition(page, "CDB Sintético", "R$ 1.000,00", "avaliada");
  await openFinancePage(page, "Lançamentos");
  const receipt = historyRow(page, "Dividendo sintético");
  await expect(receipt).toHaveCount(1);
  await expect(receipt.getByText("Rendimento", { exact: true })).toBeVisible();
  await expect(receipt.getByText("Investimentos", { exact: true })).toBeVisible();
  await expect(receipt.getByText("+ R$ 100,00")).toBeVisible();
  await expectNoHorizontalScroll(page);
  await openFinancePage(page, "Visão geral");
  await expectCash(page, "R$ 100,00", "R$ 0,00", "R$ 100,00", "R$ 100,00");

  await openFinancePage(page, "Investimentos");
  await investmentButton(page, "CDB Sintético").click();
  const detail = page.getByRole("dialog", { name: "CDB Sintético" });
  await detail.getByRole("button", { name: "Atualizar avaliação" }).click();
  const evaluation = page.getByRole("dialog", { name: "Atualizar avaliação" });
  await evaluation.getByRole("textbox", { name: "Valor informado" }).fill("1250");
  await evaluation.getByRole("button", { name: "Salvar avaliação" }).click();
  await expect(evaluation).toBeHidden();
  const valuations = detail.getByRole("region", { name: "Histórico de avaliações" });
  await expect(valuations.getByRole("listitem")).toHaveCount(2);
  await expect(valuations.getByText("R$ 1.250,00", { exact: true })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.keyboard.press("Escape");
  await expect(detail).toBeHidden();
  await checkPosition(page, "CDB Sintético", "R$ 1.250,00", "avaliada");
  await openFinancePage(page, "Visão geral");
  await expectCash(page, "R$ 100,00", "R$ 0,00", "R$ 100,00", "R$ 100,00");
});

test("aporte e resgate ajustam duas posições e o saldo sem mudar os totais do mês", async ({ page }) => {
  await page.goto("/financial/entries");
  await createEntry(page, "1000", "Salário", "Receita sintética manual");
  await createEntry(page, "-250", "Investimentos", "Despesa sintética manual");
  await expect(historyRow(page, "Receita sintética manual").getByText("+ R$ 1.000,00")).toBeVisible();
  await expect(historyRow(page, "Despesa sintética manual").getByText("− R$ 250,00")).toBeVisible();
  await openFinancePage(page, "Visão geral");
  await expectCash(page, "R$ 1.000,00", "R$ 250,00", "R$ 750,00", "R$ 750,00");

  await openFinancePage(page, "Investimentos");
  await createInvestment(page, "CDB Aporte", "500");
  await createInvestment(page, "CDB Resgate", "800");
  await registerMovement(page, "CDB Aporte", "Aporte", "200", "Aporte sintético");
  await checkPosition(page, "CDB Aporte", "R$ 700,00", "estimada");
  await openFinancePage(page, "Visão geral");
  await expectCash(page, "R$ 1.000,00", "R$ 250,00", "R$ 750,00", "R$ 550,00");

  await openFinancePage(page, "Investimentos");
  await registerMovement(page, "CDB Resgate", "Resgate", "50", "Resgate sintético");
  await checkPosition(page, "CDB Aporte", "R$ 700,00", "estimada");
  await checkPosition(page, "CDB Resgate", "R$ 750,00", "estimada");
  await expectNoHorizontalScroll(page);

  await openFinancePage(page, "Lançamentos");
  for (const [description, kind, amount] of [
    ["Aporte sintético", "Aporte", "− R$ 200,00"],
    ["Resgate sintético", "Resgate", "+ R$ 50,00"],
  ]) {
    const row = historyRow(page, description);
    await expect(row).toHaveCount(1);
    await expect(row.getByText(new RegExp(`^${kind}\\s*,\\s*transferência$`))).toBeVisible();
    await expect(row.getByText("Investimentos", { exact: true })).toBeVisible();
    await expect(row.getByText(amount, { exact: true })).toBeVisible();
  }
  await openFinancePage(page, "Visão geral");
  await expectCash(page, "R$ 1.000,00", "R$ 250,00", "R$ 750,00", "R$ 600,00");
  await expectNoHorizontalScroll(page);
});

test("entrada recorrente permanece no histórico e pode ser aberta para edição", async ({ page }) => {
  await page.goto("/financial/entries");
  await createEntry(page, "90", "Salário", "Receita recorrente sintética", true);
  const row = historyRow(page, "Receita recorrente sintética");
  await expect(row).toHaveCount(1);
  await expect(row.getByText(/^Mensal/)).toBeVisible();
  await page.getByRole("button", { name: "Gerenciar" }).click();
  await page.getByRole("menuitem", { name: "Recorrências" }).click();
  const recurring = page.getByRole("dialog", { name: "Gerenciar Recorrencias" });
  await recurring.getByRole("button", { name: "Editar recorrência Receita recorrente sintética" }).click();
  const editor = page.getByRole("dialog", { name: "Editar Entrada" });
  await editor.getByLabel("Valor", { exact: true }).fill("95");
  await editor.getByRole("button", { name: "Salvar Alterações" }).click();
  await expect(editor).toBeHidden();
  await expect(row.getByText("+ R$ 95,00")).toBeVisible();
});

for (const theme of ["light", "dark"] as const) {
  test(`carteira em ${theme}: carregamento, recuperação, vazio e teclado`, async ({ page }, testInfo) => {
    if (theme === "dark") {
      await page.getByRole("button", { name: "Menu da conta" }).click();
      await page.getByRole("menuitem", { name: "Tema escuro" }).click();
    }
    await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));

    const summaryUrl = /\/financial\/user\/\d+\/investments\/summary$/;
    let releaseSummary: () => void = () => {};
    const pending = new Promise<void>(resolve => { releaseSummary = resolve; });
    await page.route(summaryUrl, async route => {
      await pending;
      await route.fulfill({ status: 503, json: { message: "API indisponível no cenário de teste." } });
    });

    try {
      await page.goto("/financial/investments");
      await expect(page.getByText("Carregando carteira")).toBeAttached();
      await expect(page.getByText("Nenhuma aplicação na carteira")).toHaveCount(0);
      await expectNoHorizontalScroll(page);
    } finally {
      releaseSummary();
    }
    const retry = page.getByRole("alert").getByRole("button", { name: "Recarregar dados" });
    await expect(retry).toBeVisible();
    await page.unroute(summaryUrl);
    await retry.press("Enter");
    await expect(page.getByText("Nenhuma aplicação na carteira")).toBeVisible();

    const create = page.getByRole("button", { name: "Nova aplicação", exact: true }).first();
    await create.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Nova aplicação" });
    await expect(dialog).toBeVisible();
    const name = dialog.getByRole("textbox", { name: "Nome da aplicação" });
    // Enter opens the dialog, Tab moves between fields and Escape leaves a clean form.
    await name.focus();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("combobox", { name: "Classe" })).toBeFocused();
    await expectNoHorizontalScroll(page);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await createInvestment(page, "CDB Sintético", "1000");
    await checkPosition(page, "CDB Sintético", "R$ 1.000,00", "avaliada");
    await expectNoHorizontalScroll(page);
    const screenshot = testInfo.outputPath("carteira.png");
    await page.screenshot({ path: screenshot, animations: "disabled" });
    await testInfo.attach("carteira", { path: screenshot, contentType: "image/png" });
  });
}
