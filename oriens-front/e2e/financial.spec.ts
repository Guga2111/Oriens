import { Buffer } from "node:buffer";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { login } from "./helpers";

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://localhost:8080";

/** Mesmo rótulo do PageHeader: "Novembro 2026". */
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
 * Semeia dois meses para que a troca de período mude os três blocos do topo.
 * A conta E2E é nova a cada run, então os valores são determinísticos.
 */
async function seedEntries(request: APIRequestContext): Promise<void> {
  const token = process.env.E2E_TOKEN;
  if (!token) throw new Error("E2E_TOKEN ausente — globalSetup não rodou?");

  const userId = userIdFromToken(token);
  const headers = { Authorization: `Bearer ${token}` };

  const tagsResponse = await request.get(
    `${API_BASE_URL}/financial/user/${userId}/tags`,
    { headers }
  );
  expect(tagsResponse.ok()).toBeTruthy();
  const tags = (await tagsResponse.json()) as Array<{ id: number }>;
  const tagId = tags[0].id;

  const now = new Date();
  const previous = addMonths(now, -1);

  const entries = [
    {
      amount: 1000,
      entryDate: format(now, "yyyy-MM-05"),
      tagId,
      description: "Receita do mês",
      isRecurring: false,
    },
    {
      amount: -250,
      entryDate: format(now, "yyyy-MM-06"),
      tagId,
      description: "Gasto do mês",
      isRecurring: false,
    },
    {
      amount: 500,
      entryDate: format(previous, "yyyy-MM-10"),
      tagId,
      description: "Receita anterior",
      isRecurring: false,
    },
    {
      amount: -100,
      entryDate: format(previous, "yyyy-MM-11"),
      tagId,
      description: "Gasto anterior",
      isRecurring: false,
    },
  ];

  for (const entry of entries) {
    const response = await request.post(
      `${API_BASE_URL}/financial/user/${userId}/entries`,
      { headers, data: entry }
    );
    expect(response.ok()).toBeTruthy();
  }
}

// E2E 5 da SPEC §15 (P0.0) + P1.3: a troca de mês altera os 3 blocos do topo.
test("troca de mês atualiza os três blocos do resumo", async ({
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
  await expect(overview).toBeVisible();

  // Mês atual: 1000 − 250 = 750; acumulado = 750 + 400.
  await expect(overview.getByText("R$ 750,00")).toBeVisible();
  await expect(overview.getByText("+ R$ 1.000,00")).toBeVisible();
  await expect(overview.getByText("− R$ 250,00")).toBeVisible();
  await expect(overview.getByText("R$ 1.150,00")).toBeVisible();
  await expect(
    page.getByText(monthLabel(new Date()), { exact: true })
  ).toBeVisible();

  // Mês anterior: 500 − 100 = 400; o acumulado não muda.
  await page.getByRole("button", { name: "Mês anterior" }).click();
  await expect(
    page.getByText(monthLabel(addMonths(new Date(), -1)), { exact: true })
  ).toBeVisible();
  await expect(overview.getByText("R$ 400,00")).toBeVisible();
  await expect(overview.getByText("+ R$ 500,00")).toBeVisible();
  await expect(overview.getByText("− R$ 100,00")).toBeVisible();
  await expect(overview.getByText("R$ 1.150,00")).toBeVisible();

  // "Este mês" volta para o período atual.
  await page.getByRole("button", { name: "Este mês" }).click();
  await expect(
    page.getByText(monthLabel(new Date()), { exact: true })
  ).toBeVisible();
  await expect(overview.getByText("R$ 750,00")).toBeVisible();
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
