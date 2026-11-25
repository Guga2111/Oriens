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
  const projectName = `Projeto H1 ${testInfo.project.name} ${Date.now()}`;
  const dialog = page.getByRole("dialog", { name: "Novo projeto" });
  await page.getByRole("button", { name: "Novo Projeto" }).click();
  await dialog.getByLabel("Título do Projeto").fill(projectName);
  await dialog.getByRole("radio", { name: /Desenvolvimento/ }).check();
  await dialog.getByRole("button", { name: "Criar Projeto" }).click();
  await expect(dialog).toBeHidden();

  // O nome expande o seletor; somente seus subitens navegam.
  if (testInfo.project.name === "mobile") {
    await page
      .getByRole("button", { name: /alternar menu de navegação/i })
      .first()
      .click();
  }
  const projectSelector = page
    .locator('[data-sidebar="sidebar"]')
    .first()
    .getByRole("button", { name: projectName, exact: true });
  await expect(projectSelector).toBeVisible();
  const iconColors = await projectSelector.evaluate(selector => {
    const group = selector.closest('[data-sidebar="group"]');
    const icons = [
      group?.querySelector('[data-sidebar="group-label"] svg'),
      group?.querySelector('[data-sidebar="group-action"] svg'),
      selector.querySelector('svg:last-child'),
      selector.parentElement?.querySelector('[data-sidebar="menu-action"] svg'),
    ];
    return icons.map(icon => {
      if (!icon) throw new Error('Ícone de ação da sidebar não encontrado');
      return getComputedStyle(icon).color;
    });
  });
  expect(new Set(iconColors).size, 'ações e setas devem ter a mesma tonalidade').toBe(1);
  const actionOffset = await projectSelector.evaluate(selector => {
    const action = selector.parentElement?.querySelector('[data-sidebar="menu-action"]');
    const arrow = selector.querySelector('svg:last-child');
    if (!action) throw new Error('Ação de fixar projeto não encontrada');
    if (!arrow) throw new Error('Seta de expandir projeto não encontrada');
    const row = selector.getBoundingClientRect();
    const button = action.getBoundingClientRect();
    if (button.right > arrow.getBoundingClientRect().left) throw new Error('O pin deve ficar à esquerda da seta, sem sobreposição');
    return Math.abs(button.y + button.height / 2 - row.y - row.height / 2);
  });
  expect(actionOffset, 'o pin deve ficar centralizado na linha do projeto').toBeLessThan(0.5);
  const beforeExpansion = page.url();
  await projectSelector.click();
  await expect(projectSelector).toHaveAttribute('aria-expanded', 'true');
  await expect(page).toHaveURL(beforeExpansion);
  await page.getByRole('navigation', { name: 'Menu de Trabalho' }).getByRole('link', { name: 'Itens de trabalho', exact: true }).click();
  await page.waitForURL(/\/tasks\/project\/\d+/);
  if (testInfo.project.name === 'desktop') {
    await page.mouse.move(0, 0);
    await expect(projectSelector).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  }
  const detailPath = new URL(page.url()).pathname;
  // Panorama, Itens de trabalho and Objetivos are pages of the project, reached from the sidebar; the
  // breadcrumb names the one open.
  for (const [name, value] of [['Panorama', 'overview'], ['Objetivos', 'objectives'], ['Itens de trabalho', 'board']]) {
    if (testInfo.project.name === 'mobile') {
      await page.getByRole('button', { name: 'Alternar menu de navegação' }).click();
    }
    await page.getByRole('navigation', { name: 'Menu de Trabalho' }).getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`tab=${value}$`));
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).locator('[aria-current="page"]')).toContainText(name);
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
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-size', '28px');
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

test('hover da sidebar é mais discreto que o item ativo nos dois temas', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Hover de ponteiro no desktop');
  await login(page);
  await page.waitForLoadState('networkidle');
  const nav = page.getByRole('navigation', { name: 'Menu de Trabalho' });
  const active = nav.getByRole('link', { name: 'Hoje', exact: true });
  const inactive = nav.getByRole('link', { name: 'Projetos', exact: true });

  const luminance = (color: string) => {
    const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(value => {
      const channel = Number(value) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    if (!channels || channels.length !== 3) throw new Error(`Cor RGB inválida: ${color}`);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const contrast = (first: string, second: string) => {
    const a = luminance(first);
    const b = luminance(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };

  for (const dark of [false, true]) {
    await page.evaluate(value => document.documentElement.classList.toggle('dark', value), dark);
    await inactive.hover();
    const colors = await nav.evaluate(element => {
      const selected = element.querySelector('[href="/tasks"]');
      const hovered = element.querySelector('[href="/projects"]');
      const sidebar = element.closest('[data-sidebar="sidebar"]');
      if (!selected || !hovered || !sidebar) throw new Error('Navegação incompleta');
      return {
        active: getComputedStyle(selected).backgroundColor,
        hover: getComputedStyle(hovered).backgroundColor,
        text: getComputedStyle(hovered).color,
        surface: getComputedStyle(sidebar).backgroundColor,
      };
    });
    expect(contrast(colors.hover, colors.surface)).toBeGreaterThan(1);
    expect(contrast(colors.active, colors.surface)).toBeGreaterThan(contrast(colors.hover, colors.surface));
    expect(contrast(colors.text, colors.hover)).toBeGreaterThanOrEqual(4.5);
    await active.hover();
    await expect(active).toHaveCSS('background-color', colors.active);
  }
});

test('atalho da sidebar cria projeto mesmo com o grupo recolhido', async ({ page }, testInfo) => {
  await login(page);
  const mobile = testInfo.project.name === 'mobile';
  if (mobile) {
    await page.getByRole('button', { name: 'Alternar menu de navegação' }).click();
    // Geometry is only meaningful once the Sheet has finished sliding in.
    await page.getByRole('dialog', { name: 'Navegação Oriens' })
      .evaluate(sheet => Promise.all(sheet.getAnimations({ subtree: true }).map(animation => animation.finished)));
  }
  const nav = page.getByRole('navigation', { name: 'Menu de Trabalho' });
  const taskBox = await nav.getByRole('button', { name: 'Nova tarefa', exact: true }).boundingBox();
  const itemBox = await nav.getByRole('link', { name: 'Hoje', exact: true }).boundingBox();
  expect(itemBox?.x).toBe(taskBox?.x);
  expect(itemBox?.width).toBe(taskBox?.width);
  await expect(page.locator('[data-sidebar="sidebar"] [data-sidebar="header"]')).toHaveCSS('border-bottom-width', '0px');
  const group = page.getByRole('button', { name: 'Projetos', exact: true });
  await group.click();
  await expect(group).toHaveAttribute('aria-expanded', 'false');
  const create = page.getByRole('button', { name: 'Criar projeto', exact: true });
  const geometry = await create.evaluate(button => {
    const trigger = button.parentElement?.querySelector('[data-sidebar="group-label"]');
    const arrow = trigger?.querySelector('svg');
    if (!trigger || !arrow) throw new Error('Cabeçalho de projetos incompleto');
    const action = button.getBoundingClientRect();
    const row = trigger.getBoundingClientRect();
    return {
      beforeArrow: action.right <= arrow.getBoundingClientRect().left,
      centerOffset: Math.abs(action.y + action.height / 2 - row.y - row.height / 2),
    };
  });
  expect(geometry.beforeArrow).toBe(true);
  expect(geometry.centerOffset).toBeLessThan(0.5);
  const route = page.url();
  await create.click();
  const dialog = page.getByRole('dialog', { name: 'Novo projeto', exact: true });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(route);
  if (mobile) await expect(page.getByRole('dialog', { name: 'Navegação Oriens' })).toBeHidden();
  const title = `Projeto pelo menu ${testInfo.project.name} ${Date.now()}`;
  await dialog.getByLabel('Título do Projeto').fill(title);
  await dialog.getByRole('button', { name: 'Criar Projeto', exact: true }).click();
  await expect(dialog).toBeHidden();
  if (mobile) await page.getByRole('button', { name: 'Alternar menu de navegação' }).click();
  else {
    await expect(group).toHaveAttribute('aria-expanded', 'false');
    await group.click();
  }
  await expect(page.getByRole('button', { name: title, exact: true })).toBeVisible();
});

test('ações da sidebar aparecem somente no hover da própria linha ou no foco de teclado', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Hover de ponteiro no desktop');
  await login(page);
  await page.goto('/projects');
  await page.getByRole('button', { name: 'Novo projeto', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo projeto', exact: true });
  const title = `Hover da sidebar ${Date.now()}`;
  await dialog.getByLabel('Título do Projeto').fill(title);
  await dialog.getByRole('button', { name: 'Criar Projeto', exact: true }).click();
  await expect(dialog).toBeHidden();
  const header = page.getByRole('button', { name: 'Projetos', exact: true });
  const create = page.getByRole('button', { name: 'Criar projeto', exact: true });
  const selector = page.getByRole('button', { name: title, exact: true });
  // The project card on the page has a pin of the same name; this test is about the sidebar's.
  const pin = page.getByRole('navigation', { name: 'Menu de Trabalho' }).getByRole('button', { name: `Fixar ${title}`, exact: true });
  await expect(selector).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(create).toHaveCSS('opacity', '0');
  await expect(pin).toHaveCSS('opacity', '0');
  await header.hover();
  await expect(create).toHaveCSS('opacity', '1');
  await expect(pin).toHaveCSS('opacity', '0');
  await selector.hover();
  await expect(create).toHaveCSS('opacity', '0');
  await expect(pin).toHaveCSS('opacity', '1');
  await pin.hover();
  await expect(pin).toHaveCSS('opacity', '1');
  await pin.click();
  const unpin = page.getByRole('button', { name: `Desafixar ${title}`, exact: true });
  await expect(unpin).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(unpin).toHaveCSS('opacity', '1');
  await expect(create).toHaveCSS('opacity', '0');
  await unpin.click();
  await expect(pin).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(pin).toHaveCSS('opacity', '0');
  await selector.click();
  await page.getByRole('navigation', { name: 'Menu de Trabalho' }).getByRole('link', { name: 'Visão geral', exact: true }).hover();
  await expect(create).toHaveCSS('opacity', '0');
  await expect(pin).toHaveCSS('opacity', '0');
  await page.mouse.move(0, 0);
  await page.keyboard.press('Tab');
  await pin.focus();
  await expect(pin).toHaveCSS('opacity', '1');
  await create.focus();
  await expect(create).toHaveCSS('opacity', '1');
  await expect(pin).toHaveCSS('opacity', '0');
});
