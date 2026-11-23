import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// SPEC §13.2 A1 / P0.2: exatamente um `h1` por rota autenticada.

const ROUTES = [
  "/tasks",
  "/projects",
  "/stats",
  "/config",
  "/financial",
  "/all-data",
  "/support",
  "/admin/support",
  "/admin/management",
];

test("cada rota autenticada tem exatamente um h1", async ({ page }, testInfo) => {
  await login(page);

  // Cria um projeto para cobrir /tasks/project/:id (rota autenticada).
  await page.goto("/projects");
  const projectName = `Projeto H1 ${Date.now()}`;
  const dialog = page.getByRole("dialog", { name: "Novo projeto" });
  await page.getByRole("button", { name: "Novo Projeto" }).click();
  await dialog.getByLabel("Título do Projeto").fill(projectName);
  await dialog.getByRole("radio", { name: /Desenvolvimento/ }).check();
  await dialog.getByRole("button", { name: "Criar Projeto" }).click();
  await expect(dialog).toBeHidden();

  // O card de projeto não é link: a rota de detalhe é alcançada pelos
  // favoritos da sidebar (no mobile é preciso abrir o Sheet).
  if (testInfo.project.name === "mobile") {
    await page
      .getByRole("button", { name: /alternar menu de navegação/i })
      .first()
      .click();
  }
  const detailLink = page
    .locator('[data-sidebar="sidebar"]')
    .first()
    .getByRole("link", { name: projectName });
  await expect(detailLink).toBeVisible();
  await detailLink.click();
  await page.waitForURL(/\/tasks\/project\/\d+/);
  const detailPath = new URL(page.url()).pathname;
  for (const [name, value, tab] of [['Objetivos', 'objectives', 'Objetivos'], ['Linha do tempo', 'timeline', 'Timeline'], ['Quadro', 'board', 'Quadro']]) {
    if (testInfo.project.name === 'mobile') {
      await page.getByRole('button', { name: 'Alternar menu de navegação' }).click();
    }
    await page.getByRole('navigation', { name: 'Menu de Trabalho' }).getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`tab=${value}$`));
    await expect(page.getByRole('tab', { name: tab, exact: true })).toHaveAttribute('aria-selected', 'true');
  }

  for (const route of [...ROUTES, detailPath]) {
    await page.goto(route);
    await expect(
      page.locator("h1"),
      `rota ${route} deveria ter exatamente um h1`
    ).toHaveCount(1);
  }
});

test("teclado abre a navegação e segue um link com Enter", async ({ page }, testInfo) => {
  await login(page);
  if (testInfo.project.name === "mobile") {
    const trigger = page.getByRole("button", { name: /alternar menu de navegação/i }).first();
    await trigger.focus();
    await page.keyboard.press("Enter");
  } else {
    const sidebar = page.getByRole('navigation', { name: 'Menu de Trabalho' });
    await expect(sidebar).toBeVisible();
    await page.keyboard.press("Control+b");
    await expect(sidebar).toBeHidden();
    await expect(page.getByRole('navigation', { name: 'Contextos' })).toBeVisible();
    await page.keyboard.press("Control+b");
    await expect(sidebar).toBeVisible();
  }
  const projects = page.locator('[data-sidebar="sidebar"]').getByRole("link", { name: "Projetos", exact: true });
  // Tab is the only way focus moves through the open navigation.
  for (let i = 0; i < 30 && !(await projects.evaluate((element) => element === document.activeElement)); i++) {
    await page.keyboard.press("Tab");
  }
  await expect(projects).toBeFocused();
  expect(await projects.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("heading", { level: 1, name: "Projetos" })).toBeVisible();
});

test('shell mantém medidas aprovadas e permite esconder a sidebar', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Geometria desktop');
  await login(page);
  const top = page.getByRole('banner', { name: 'Barra superior' });
  const rail = page.getByRole('navigation', { name: 'Contextos' });
  const panel = page.locator('[data-app-panel]');
  expect((await top.boundingBox())?.height).toBe(40);
  expect((await rail.boundingBox())?.width).toBe(60);
  const box = await panel.boundingBox();
  expect(box?.x).toBe(60);
  expect(box?.y).toBe(40);
  expect(box?.width).toBe(1440 - 60 - 8);
  expect(box?.height).toBe(900 - 40 - 8);
  const header = page.getByRole('navigation', { name: 'Breadcrumb' }).locator('..');
  expect((await header.boundingBox())?.height).toBe(48);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-size', '20px');
  await expect(page.getByRole('button', { name: 'Nova tarefa', exact: true })).toHaveCSS('height', '32px');
  await page.getByRole('button', { name: 'Esconder menu' }).click();
  await expect(page.getByRole('navigation', { name: 'Menu de Trabalho' })).toBeHidden();
  await expect(rail).toBeVisible();
  await page.getByRole('button', { name: 'Alternar menu de navegação' }).click();
  await expect(page.getByRole('navigation', { name: 'Menu de Trabalho' })).toBeVisible();
});

test('Nova tarefa da sidebar abre o TaskEditor e mantém o formulário ao fechar o menu', async ({ page }, testInfo) => {
  await login(page);
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Alternar menu de navegação' }).click();
  }
  await page.getByRole('navigation', { name: 'Menu de Trabalho' }).getByRole('button', { name: 'Nova tarefa' }).click();
  const editor = page.getByRole('dialog', { name: 'Nova tarefa' });
  await expect(editor).toBeVisible();
  if (testInfo.project.name === 'mobile') {
    await expect(page.getByRole('dialog', { name: 'Navegação Oriens' })).toBeHidden();
  }
  await editor.getByLabel('Título', { exact: true }).fill('Rascunho pelo menu');
  await expect(editor.getByLabel('Título', { exact: true })).toHaveValue('Rascunho pelo menu');
});

test('ação principal da sidebar não anima no hover nem muda de tamanho ao pressionar', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Interação de ponteiro no desktop');
  await login(page);
  const action = page.getByRole('navigation', { name: 'Menu de Trabalho' })
    .getByRole('button', { name: 'Nova tarefa', exact: true });
  const before = await action.boundingBox();
  await action.hover();
  await expect(action).toHaveCSS('transition-property', 'none');
  await expect(action).toHaveCSS('animation-name', 'none');
  await page.mouse.down();
  try {
    expect(await action.boundingBox()).toEqual(before);
    await expect(action).toHaveCSS('transition-property', 'none');
  } finally {
    await page.mouse.move(0, 0);
    await page.mouse.up();
  }
});
