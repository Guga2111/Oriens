import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";

async function createTask(page: Page, title: string): Promise<void> {
  const dialog = page.getByRole("dialog", { name: "Criar Nova Tarefa" });

  await page.getByRole("button", { name: "Nova Tarefa" }).click();
  await expect(dialog).toBeVisible();
  await dialog.locator("#title").fill(title);
  await dialog.locator("#startTime").fill("09:00");
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: "Média" }).click();

  await Promise.all([
    page.waitForResponse(
      (r) => r.request().method() === "POST" && r.url().includes("/task/user/")
    ),
    dialog.getByRole("button", { name: "Salvar Tarefa" }).click(),
  ]);
  await expect(dialog).toBeHidden();
}

test("semana em 1440: cabeçalho do dia leva à visão dia", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Cobertura de 1440/1024 no projeto desktop"
  );

  await login(page);
  const title = `Revisar pull request de requisições urgentíssimas ${Date.now()}`;
  await createTask(page, title);

  await page.getByRole("radio", { name: "Ver semana" }).click();
  await expect(
    page.getByRole("region", { name: "Grade semanal" })
  ).toBeVisible();

  const todayHeader = page.locator('button[aria-current="date"]');
  await expect(todayHeader).toBeVisible();
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  await todayHeader.click();

  await expect(page.getByRole("radio", { name: "Ver dia" })).toBeChecked();
  await expect(
    page.getByRole("heading", { level: 2, name: "Manhã" })
  ).toBeVisible();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
});

test("semana em 1024: a grade rola dentro do container, não a página", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Cobertura de 1440/1024 no projeto desktop"
  );

  await page.setViewportSize({ width: 1024, height: 768 });
  await login(page);
  await page.getByRole("radio", { name: "Ver semana" }).click();

  const region = page.getByRole("region", { name: "Grade semanal" });
  await expect(region).toBeVisible();

  const pageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(pageOverflow).toBeLessThanOrEqual(0);

  const scroll = await region.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(scroll.scrollWidth).toBeGreaterThan(scroll.clientWidth);
});
