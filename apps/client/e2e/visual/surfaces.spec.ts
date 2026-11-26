import { expect, test, type Page } from "@playwright/test";
import { prepareVisualPage } from "./fixtures";

async function waitForRender(page: Page, theme: "light" | "dark") {
  await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
  expect(await page.evaluate(async () => {
    const fonts = await document.fonts.load("400 16px Inter");
    await document.fonts.ready;
    return fonts.some((font) => font.family === "Inter" && font.status === "loaded");
  })).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  );
  await page.mouse.move(-1, -1);
}

test("landing e navegação para entrar", async ({ page, colorScheme }) => {
  const theme = colorScheme === "dark" ? "dark" : "light";
  const unexpected = await prepareVisualPage(page, theme);

  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  const title = page.getByRole("heading", { level: 1, name: "Organize suas tarefas com Oriens" });
  await expect(title).toBeVisible();
  const preview = page.getByRole("img", { name: "Tela de hoje do Oriens com as tarefas do dia em três períodos" });
  await expect(preview).toBeVisible();
  await preview.evaluate((image: HTMLImageElement) => image.decode());

  await waitForRender(page, theme);
  await expect(page).toHaveScreenshot("landing.png");

  const start = page.getByRole("link", { name: "Começar agora" });
  await start.focus();
  await expect(start).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Entrar no Oriens" })).toBeVisible();
  expect(unexpected).toEqual([]);
});

test("editor de tarefas com título obrigatório", async ({ page, colorScheme }) => {
  const theme = colorScheme === "dark" ? "dark" : "light";
  const unexpected = await prepareVisualPage(page, theme, true);

  await page.goto("/tasks");
  await expect(page.getByRole("heading", { level: 1, name: "Hoje" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Manhã" })).toBeVisible();
  await page.getByRole("main").getByRole("button", { name: "Nova Tarefa", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Nova tarefa" });
  await expect(editor).toBeVisible();
  await expect(editor.getByText("0 outras tarefas ativas planejadas · 0 concluídas")).toBeVisible();

  await editor.getByRole("button", { name: "Salvar tarefa" }).click();
  await expect(editor.getByRole("alert")).toHaveText("Informe o título da tarefa.");
  const title = editor.getByRole("textbox", { name: "Título" });
  await expect(title).toBeFocused();
  await expect(title).toHaveAccessibleDescription("Informe o título da tarefa.");

  await waitForRender(page, theme);
  await expect(editor).toHaveScreenshot("task-editor-validation.png");

  await page.keyboard.press("Escape");
  await expect(editor).toBeHidden();
  expect(unexpected).toEqual([]);
});
