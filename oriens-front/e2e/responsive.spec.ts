import { Buffer } from "node:buffer";
import { expect, test } from "@playwright/test";
import { format } from "date-fns";
import { login } from "./helpers";

// Asserts de responsividade do projeto mobile (SPEC §15 P0.0 e P2.0).
// Passam a valer como testes normais a partir do P0.2 (PR 1.2) e recebem os
// novos asserts do P2.0: agenda semanal vertical, listas no lugar das
// tabelas e filtros dentro de um Sheet.

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://localhost:8080";

function userIdFromToken(token: string): number {
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString("utf8")
  );
  return payload.userId as number;
}

async function seedTask(title: string): Promise<void> {
  const token = process.env.E2E_TOKEN;
  if (!token) throw new Error("E2E_TOKEN ausente — globalSetup não rodou?");
  const userId = userIdFromToken(token);

  const response = await fetch(`${API_BASE_URL}/task/user/${userId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      description: "Tarefa semeada para os asserts de mobile",
      startTime: "09:00",
      dueDate: format(new Date(), "yyyy-MM-dd"),
      priority: "MEDIUM",
    }),
  });
  expect(response.ok).toBeTruthy();
}

async function seedProject(title: string): Promise<void> {
  const token = process.env.E2E_TOKEN;
  if (!token) throw new Error("E2E_TOKEN ausente — globalSetup não rodou?");
  const userId = userIdFromToken(token);

  const response = await fetch(`${API_BASE_URL}/project/user/${userId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      description: "Projeto semeado para os asserts de mobile",
      color: "#7B1E3A",
      objectives: [],
    }),
  });
  expect(response.ok).toBeTruthy();
}

async function pageOverflow(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
}

test("mobile: /tasks não tem rolagem horizontal", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "Assert definido para o projeto mobile (SPEC §15)"
  );

  await login(page);

  const overflow = await pageOverflow(page);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("mobile: existe controle visível para abrir a navegação", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "Assert definido para o projeto mobile (SPEC §15)"
  );

  await login(page);

  const control = page.getByRole("button", {
    name: /alternar menu de navegação/i,
  });
  await expect(control.first()).toBeVisible();
});

test("mobile: /tasks no dia mostra a linha do dia compacta sem overflow", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "Assert definido para o projeto mobile (SPEC §15 P2.0)"
  );

  const title = `Dia mobile ${Date.now()}`;
  await seedTask(title);

  await login(page);

  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Linha do dia" })).toBeVisible();
  expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
});

test("mobile: /tasks na semana usa a agenda vertical sem overflow", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "Assert definido para o projeto mobile (SPEC §15 P2.0)"
  );

  const title = `Semana mobile ${Date.now()}`;
  await seedTask(title);

  await login(page);
  await page.getByRole("radio", { name: "Ver semana" }).click();

  const agenda = page.getByRole("region", { name: "Agenda semanal" });
  await expect(agenda).toBeVisible();
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  const scroll = await agenda.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth);
  expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
});

test("mobile: /financial não tem rolagem horizontal e os filtros ficam no Sheet", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "Assert definido para o projeto mobile (SPEC §15 P2.0)"
  );

  await login(page);
  await page.goto("/financial");

  await expect(
    page.getByRole("heading", { level: 1, name: "Financeiro" })
  ).toBeVisible();
  expect(await pageOverflow(page)).toBeLessThanOrEqual(0);

  await page.getByRole("button", { name: /Filtros/ }).first().click();
  await expect(page.getByRole("heading", { name: "Filtros" })).toBeVisible();
  await expect(page.getByLabel("Filtrar por período")).toBeVisible();
});

test("mobile: /all-data vira lista e os filtros ficam no Sheet", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "Assert definido para o projeto mobile (SPEC §15 P2.0)"
  );

  const title = `Lista mobile ${Date.now()}`;
  await seedTask(title);
  await seedProject(`Projeto mobile ${Date.now()}`);

  await login(page);
  await page.goto("/all-data?tab=tasks");

  const list = page.getByRole("list", { name: "Lista de tarefas" });
  await expect(list).toBeVisible();
  await expect(list.getByText(title, { exact: true })).toBeVisible();
  expect(await pageOverflow(page)).toBeLessThanOrEqual(0);

  await page.getByRole("button", { name: /Filtros/ }).first().click();
  await expect(page.getByRole("heading", { name: "Filtros" })).toBeVisible();
  await expect(page.getByLabel("Status")).toBeVisible();

  await page.keyboard.press("Escape");

  await page.getByRole("tab", { name: "Projetos" }).click();
  await expect(page.getByRole("list", { name: "Lista de projetos" })).toBeVisible();
  expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
});

test("mobile: canvas e listas cabem em 360px", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Cobertura adicional de R1 em 360px");
  await page.setViewportSize({ width: 360, height: 844 });
  await login(page);
  expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
  await page.getByRole("radio", { name: "Ver semana" }).click();
  await expect(page.getByRole("region", { name: "Agenda semanal" })).toBeVisible();
  expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
  for (const path of ["/financial", "/all-data?tab=tasks", "/all-data?tab=projects", "/projects", "/config", "/support", "/stats"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await pageOverflow(page), path).toBeLessThanOrEqual(0);
    const lists = page.getByRole("list", { name: /^Lista de/ });
    for (const list of await lists.all()) {
      if (await list.isVisible()) {
        expect(await list.evaluate((element) => element.scrollWidth - element.clientWidth), path).toBeLessThanOrEqual(0);
      }
    }
  }
});

test("mobile: formulários longos usam Drawer sem overflow em 360px", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Drawer R6 abaixo de 640px");
  await page.setViewportSize({ width: 360, height: 844 });
  await login(page);
  for (const [path, trigger, title] of [
    ["/tasks", "Nova Tarefa", "Criar Nova Tarefa"],
    ["/financial", "Nova entrada", "Nova Entrada"],
    ["/projects", "Novo projeto", "Criar Novo Projeto"],
  ]) {
    await page.goto(path);
    await page.getByRole("button", { name: trigger, exact: true }).first().click();
    const dialog = page.getByRole("dialog", { name: title });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("data-vaul-drawer", "");
    expect(await dialog.evaluate((element) => element.scrollWidth - element.clientWidth), path).toBeLessThanOrEqual(0);
    expect((await dialog.boundingBox())!.height, path).toBeLessThanOrEqual(844 * 0.9 + 1);
    expect(await pageOverflow(page), path).toBeLessThanOrEqual(0);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  }
});
