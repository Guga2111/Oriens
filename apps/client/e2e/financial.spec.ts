import { Buffer } from "node:buffer";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { login } from "./helpers";

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://localhost:8080";

/** Mesmo rótulo do seletor de mês: "Novembro 2026". */
function monthLabel(date: Date): string {
  const label = format(date, "MMMM yyyy", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function userIdFromToken(token: string): number {
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString("utf8")
  );
  return payload.userId as number;
}

/**
 * Semeia dois meses para que a troca de período mude os indicadores.
 * A conta E2E é nova a cada run, então os valores são determinísticos.
 */
type SeedEntry = { amount: number; tagId: number; entryDate: string; description: string; isRecurring: boolean };
type SeedTags = { incomeTagId: number; expenseTagId: number };

async function seedEntries(request: APIRequestContext): Promise<void> {
  const now = new Date();
  const previous = addMonths(now, -1);
  await postEntries(request, ({ incomeTagId, expenseTagId }) => [
    { amount: 1000, tagId: incomeTagId, entryDate: format(now, "yyyy-MM-05"), description: "Receita do mês", isRecurring: false },
    { amount: -250, tagId: expenseTagId, entryDate: format(now, "yyyy-MM-06"), description: "Gasto do mês", isRecurring: false },
    { amount: 500, tagId: incomeTagId, entryDate: format(previous, "yyyy-MM-10"), description: "Receita anterior", isRecurring: false },
    { amount: -100, tagId: expenseTagId, entryDate: format(previous, "yyyy-MM-11"), description: "Gasto anterior", isRecurring: false },
  ]);
}

async function postEntries(request: APIRequestContext, build: (tags: SeedTags) => SeedEntry[]): Promise<void> {
  const token = process.env.E2E_TOKEN;
  if (!token) throw new Error("E2E_TOKEN ausente — globalSetup não rodou?");

  const userId = userIdFromToken(token);
  const headers = { Authorization: `Bearer ${token}` };

  const tagsResponse = await request.get(
    `${API_BASE_URL}/financial/user/${userId}/tags`,
    { headers }
  );
  expect(tagsResponse.ok()).toBeTruthy();
  const tags = (await tagsResponse.json()) as Array<{ id: number; name: string }>;
  // Salário recusa valores negativos; as despesas vão para outra tag padrão.
  const incomeTagId = tags.find((tag) => tag.name === "Salário")!.id;
  const expenseTagId = tags.find((tag) => !["Salário", "Investimentos"].includes(tag.name))!.id;

  const entries = build({ incomeTagId, expenseTagId });

  for (const entry of entries) {
    const response = await request.post(
      `${API_BASE_URL}/financial/user/${userId}/entries`,
      { headers: { ...headers, "Idempotency-Key": crypto.randomUUID() }, data: entry }
    );
    expect(response.ok()).toBeTruthy();
  }
}

// Visão geral (#117): o mês selecionado governa os indicadores, o saldo
// disponível acumula até o fim dele e a categoria abre o histórico filtrado.
test("troca de mês atualiza os indicadores e a categoria abre o histórico", async ({
  page,
  request,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Os dados são semeados uma única vez; a cobertura visual fica no desktop"
  );

  await seedEntries(request);
  await login(page);
  await page.goto("/financial");

  const overview = page.getByRole("region", { name: "Resumo do mês" });
  const metric = (label: string) =>
    overview.locator("dt").getByText(label, { exact: true }).locator("xpath=following-sibling::dd[1]");
  await expect(overview).toBeVisible();

  // Mês atual: 1000 − 250 = 750; saldo disponível = 750 + 400.
  await expect(metric("Receitas")).toHaveText("R$ 1.000,00");
  await expect(metric("Despesas")).toHaveText("R$ 250,00");
  await expect(metric("Resultado do mês")).toHaveText("R$ 750,00");
  await expect(metric("Saldo disponível")).toHaveText("R$ 1.150,00");
  await expect(
    page.getByText(monthLabel(new Date()), { exact: true })
  ).toBeVisible();

  // Mês anterior: 500 − 100 = 400; o saldo disponível termina nesse mês.
  await page.getByRole("button", { name: "Mês anterior" }).click();
  await expect(
    page.getByText(monthLabel(addMonths(new Date(), -1)), { exact: true })
  ).toBeVisible();
  await expect(metric("Receitas")).toHaveText("R$ 500,00");
  await expect(metric("Despesas")).toHaveText("R$ 100,00");
  await expect(metric("Resultado do mês")).toHaveText("R$ 400,00");
  await expect(metric("Saldo disponível")).toHaveText("R$ 400,00");

  // A categoria abre Lançamentos com o mês e a tag aplicados.
  await overview.getByRole("button", { name: /das despesas\. Ver lançamentos/ }).first().click();
  await expect(page).toHaveURL(/\/financial\/entries\?start=\d{4}-\d{2}-01&end=\d{4}-\d{2}-\d{2}&tag=\d+$/);
  await expect(page.getByRole("navigation", { name: "Menu de Financeiro" }).getByRole("link", { name: "Lançamentos" })).toHaveAttribute("aria-current", "page");
  const history = page.getByRole("table");
  await expect(history.getByText("Gasto anterior")).toBeVisible();
  await expect(history.getByText("Receita anterior")).toHaveCount(0);
  await expect(history.getByText("Gasto do mês")).toHaveCount(0);

  // Voltar mantém o mês na URL; "Este mês" retorna ao período atual.
  await page.goBack();
  await expect(metric("Resultado do mês")).toHaveText("R$ 400,00");
  await page.getByRole("button", { name: "Este mês" }).click();
  await expect(
    page.getByText(monthLabel(new Date()), { exact: true })
  ).toBeVisible();
  await expect(metric("Resultado do mês")).toHaveText("R$ 750,00");
});

// Lançamentos (#118): busca e filtros ficam na barra superior, combinam-se,
// seguem na URL e sobrevivem a uma edição; limpar devolve o histórico completo.
test("busca e filtros do histórico combinam, seguem na URL e persistem após editar", async ({ page, request }, testInfo) => {
  // A conta é compartilhada entre os projetos; o sufixo isola os lançamentos de cada um.
  const suffix = testInfo.project.name;
  // Um mês futuro não altera os indicadores verificados pelo teste da Visão geral.
  const day = format(addMonths(new Date(), 2), "yyyy-MM-03");
  await postEntries(request, ({ incomeTagId, expenseTagId }) => [
    { amount: -40, tagId: expenseTagId, entryDate: day, description: `Mercado ${suffix}`, isRecurring: false },
    { amount: -15, tagId: expenseTagId, entryDate: day, description: `Padaria ${suffix}`, isRecurring: false },
    { amount: 300, tagId: incomeTagId, entryDate: day, description: `Freela ${suffix}`, isRecurring: false },
  ]);
  await login(page);
  await page.goto("/financial/entries");
  await expect(page.getByRole("heading", { level: 1, name: "Lançamentos" })).toBeAttached();
  const history = testInfo.project.name === "mobile"
    ? page.getByRole("list", { name: "Lista de entradas" })
    : page.getByRole("table");

  await page.getByRole("button", { name: "Buscar lançamentos" }).click();
  await page.getByRole("searchbox", { name: "Buscar na descrição" }).fill(`Mercado ${suffix}`);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/[?&]q=Mercado/);
  await expect(history.getByText(`Mercado ${suffix}`)).toBeVisible();
  await expect(history.getByText(`Padaria ${suffix}`)).toHaveCount(0);

  // Busca e categoria se combinam: a receita não tem "Mercado" na descrição.
  await page.getByRole("button", { name: /^Filtros/ }).click();
  const filters = page.getByRole("dialog", { name: "Filtros" });
  await filters.getByRole("combobox", { name: "Categoria" }).click();
  await page.getByRole("option", { name: "Salário" }).click();
  await expect(page).toHaveURL(/[?&]tag=\d+/);
  await expect(page.getByText("Nenhum resultado encontrado")).toBeVisible();

  await filters.getByRole("button", { name: "Limpar filtros" }).click();
  await page.keyboard.press("Escape");
  await expect(filters).toBeHidden();
  await expect(page).toHaveURL(/\/financial\/entries$/);
  await expect(history.getByText(`Padaria ${suffix}`)).toBeVisible();

  // Editar com a busca ativa mantém o recorte e mostra o valor novo.
  await page.getByRole("button", { name: "Buscar lançamentos" }).click();
  await page.getByRole("searchbox", { name: "Buscar na descrição" }).fill(`Padaria ${suffix}`);
  await page.keyboard.press("Enter");
  await expect(history.getByText(`Mercado ${suffix}`)).toHaveCount(0);
  await history.getByRole("button", { name: `Editar entrada: Padaria ${suffix}` }).click();
  const dialog = page.getByRole("dialog", { name: "Editar Entrada" });
  await dialog.getByLabel("Valor").fill("-18");
  await dialog.getByRole("button", { name: "Salvar Alterações" }).click();
  await expect(dialog).toBeHidden();
  await expect(history.getByText("− R$ 18,00")).toBeVisible();
  await expect(page).toHaveURL(/[?&]q=Padaria/);
  await expect(history.getByText(`Mercado ${suffix}`)).toHaveCount(0);
});

// BE6: POST /financial/user/{id}/tags devolve 403 para conta nova.
// Marcado como fixme até o backend corrigir (SPEC §15/§18.2).
test.fixme("cria tag financeira (BE6)", async ({ page }) => {
  await login(page);
  await page.goto("/financial");

  await page.getByRole("button", { name: "Gerenciar" }).click();
  await page.getByRole("menuitem", { name: "Tags" }).click();
  const dialog = page.getByRole("dialog", { name: "Gerenciar Tags" });
  await dialog.getByRole("button", { name: "Nova Tag" }).click();

  const tagName = `Tag E2E ${Date.now()}`;
  await dialog.locator("#tag-name").fill(tagName);
  await dialog.getByRole("button", { name: "Criar", exact: true }).click();

  await expect(dialog.getByText(tagName)).toBeVisible();
});
