import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";

const DESTINATIONS = [
  { context: 'Trabalho', name: 'Projetos', path: '/projects' },
  { context: 'Trabalho', name: 'Explorar', path: '/all-data' },
  { context: 'Financeiro', name: 'Visão geral', path: '/financial' },
  { context: 'Estatísticas', name: 'Visão geral', path: '/stats' },
  { context: 'Configurações', name: 'Configurações', path: '/config' },
  { context: 'Configurações', name: 'Ajuda & Suporte', path: '/support' },
  { context: 'Trabalho', name: 'Hoje', path: '/tasks' },
];

async function openNavigation(page: Page, mobile: boolean) {
  if (!mobile) return;
  await page.getByRole('button', { name: 'Alternar menu de navegação' }).click();
  await expect(page.getByRole('dialog', { name: 'Navegação Oriens' })).toBeVisible();
}

async function navigate(page: Page, mobile: boolean, item: typeof DESTINATIONS[number]) {
  await openNavigation(page, mobile);
  const rail = page.getByRole('navigation', { name: 'Contextos' });
  const context = rail.getByRole('link', { name: item.context, exact: true });
  if (await context.getAttribute('aria-current') !== 'page') {
    await context.click();
    if (mobile) {
      await expect(page.getByRole('dialog', { name: 'Navegação Oriens' })).toBeHidden();
      await openNavigation(page, mobile);
    }
  }
  await expect(rail.locator('[aria-current=page]')).toHaveAccessibleName(item.context);
  const sameRoute = new URL(page.url()).pathname === item.path;
  await page.getByRole('navigation', { name: `Menu de ${item.context}` })
    .getByRole('link', { name: item.name, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${item.path}$`));
  // Selecting the already-current destination does not change the route.
  if (mobile) {
    if (sameRoute) await page.getByRole('button', { name: 'Esconder menu' }).click();
    await expect(page.getByRole('dialog', { name: 'Navegação Oriens' })).toBeHidden();
  }
}

test('navega por todos os contextos e itens sem document request', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile';
  await login(page);
  const requests: string[] = [];
  page.on('request', request => {
    if (request.resourceType() === 'document') requests.push(request.url());
  });
  for (const item of DESTINATIONS) await navigate(page, mobile, item);
  for (const [name, path] of [['Configurações', '/config'], ['Ajuda & Suporte', '/support']]) {
    await page.getByRole('button', { name: 'Menu da conta' }).click();
    const menu = page.getByRole('menu');
    await menu.getByRole('menuitem', { name, exact: true }).click();
    await expect(menu).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
  expect(requests).toEqual([]);
});

test('barra superior preserva notificações, conta, tema e saída', async ({ page }) => {
  await login(page);
  const top = page.getByRole('banner', { name: 'Barra superior' });
  await expect(top.getByRole('button', { name: /Notificações/ })).toBeVisible();
  await top.getByRole('button', { name: 'Menu da conta' }).click();
  const menu = page.getByRole('menu');
  for (const name of ['Configurações', 'Ajuda & Suporte', 'Sair']) {
    await expect(menu.getByRole('menuitem', { name, exact: true })).toBeVisible();
  }
  const dark = await page.locator('html').evaluate(element => element.classList.contains('dark'));
  await menu.getByRole('menuitem', { name: dark ? 'Tema claro' : 'Tema escuro' }).click();
  await expect(page.locator('html')).toHaveClass(dark ? /^(?!.*\bdark\b)/ : /dark/);
  // Restore this isolated E2E account's preference for the other tests.
  await top.getByRole('button', { name: 'Menu da conta' }).click();
  await menu.getByRole('menuitem', { name: dark ? 'Tema escuro' : 'Tema claro' }).click();
  await expect(menu).toBeHidden();
});
