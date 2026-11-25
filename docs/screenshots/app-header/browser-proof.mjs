import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from '../../../apps/client/node_modules/playwright-core/index.mjs';

const phase = process.argv[2] || 'after';
const base = process.argv[3] || 'http://127.0.0.1:4222';
const out = new URL(`./${phase}/`, import.meta.url);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', headless: true });
const errors = [], measurements = [];
const summary = { totalObjectives: 0, completedObjectives: 0, totalTasks: 0, nonCancelledTasks: 0, completedTasks: 0, cancelledTasks: 0, plannedTodayCount: 0, previousPlansCount: 0, overdueTaskCount: 0, dueTodayTaskCount: 0, overdueObjectiveCount: 0, nextPlannedTask: null, nextObjective: null };
const project = { id: 9, userId: 1, title: 'Planejamento do lançamento e revisão da experiência do Oriens', description: 'Organizar a próxima versão do produto.', color: null, imageUrl: null, mode: 'SIMPLE', version: 1, favorite: false, archived: false, lastAccessed: null, defaultPendingColumnId: null, defaultCompletedColumnId: null, objectives: [], summary };
const empty = { content: [], number: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true };
let p;

try {
  p = await browser.newPage({ locale: 'pt-BR', timezoneId: 'America/Recife' });
  p.setDefaultTimeout(10000);
  p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => {
    const payload = btoa(JSON.stringify({ sub: 'review@example.invalid', exp: 4102444800, userId: 1, username: 'Conta de revisão', role: 'ADMIN' }));
    localStorage.setItem('authToken', `eyJhbGciOiJub25lIn0.${payload}.review`);
  });
  await p.route(/(?:localhost:8080|\/api\/)/, async route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    let data;
    if (path === '/user/1') data = { id: 1, name: 'Conta de revisão', role: 'ADMIN' };
    else if (path === '/user/1/preferences') data = { notifications: true, sound: false, theme: 'light' };
    else if (path === '/project/9') data = project;
    else if (path.endsWith('/sidebar')) data = [project];
    else if (path.endsWith('/summary')) data = { totalProjects: 1, activeProjects: 1, favoriteProjects: 0, archivedProjects: 0 };
    else if (path.includes('/notifications/') || path.includes('/tags') || path.includes('/task-label')) data = [];
    else data = empty;
    await route.fulfill({ json: data });
  });
  for (const width of [1440, 768, 390]) {
    await p.setViewportSize({ width, height: 900 });
    await p.goto(`${base}/tasks/project/9`);
    await p.getByRole('heading', { level: 1, name: project.title, exact: true }).waitFor();
    await p.evaluate(() => document.fonts.ready);
    for (const state of width >= 1100 ? ['expanded', 'collapsed'] : ['mobile']) {
      if (state === 'collapsed') {
        await p.getByRole('button', { name: 'Alternar menu de navegação', exact: true }).click();
        await p.locator('[data-state=collapsed][data-side]').evaluate(el => Promise.all(el.getAnimations({ subtree: true }).filter(a => a.effect.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))));
      }
      const metrics = await p.evaluate(() => {
        const header = document.querySelector('main > header'), bar = header.getBoundingClientRect();
        const sidebar = document.querySelector('[data-sidebar=header]')?.getBoundingClientRect();
        const css = getComputedStyle(header);
        return { headerHeight: bar.height, headerBottom: bar.bottom, headerPadding: [css.paddingLeft, css.paddingRight].map(parseFloat), sidebarHeight: sidebar?.height, sidebarBottom: sidebar?.bottom, overflow: document.documentElement.scrollWidth > innerWidth, breadcrumbCount: document.querySelectorAll('nav[aria-label=Breadcrumb]').length };
      });
      measurements.push({ width, state, ...metrics });
      if (phase === 'after') {
        assert.equal(metrics.headerHeight, 64);
        assert.deepEqual(metrics.headerPadding, [16, 16]);
        if (state !== 'mobile') assert.equal(metrics.headerBottom, metrics.sidebarBottom);
        assert.equal(metrics.overflow, false);
        assert.equal(metrics.breadcrumbCount, 1);
        assert.equal(await p.locator('[data-page-content] nav[aria-label=Breadcrumb]').count(), 0);
        await p.locator('main > header nav [aria-current=page]').filter({ hasText: project.title }).waitFor();
        for (const name of ['Alternar menu de navegação', 'Notificações']) {
          const box = await p.getByRole('button', { name, exact: true }).boundingBox();
          assert(box.width >= 44 && box.height >= 44, `${name}: touch target`);
        }
      }
      await p.screenshot({ path: new URL(`${width}-${state}.png`, out).pathname });
      if (width === 1440 && state === 'expanded') {
        const html = await p.evaluate(() => {
          const clone = document.documentElement.cloneNode(true);
          clone.querySelectorAll('script, link[rel=stylesheet]').forEach(el => el.remove());
          const style = document.createElement('style');
          style.textContent = [...document.styleSheets].map(sheet => { try { return [...sheet.cssRules].map(r => r.cssText).join('\n'); } catch { return ''; } }).join('\n');
          clone.querySelector('head').append(style);
          return '<!doctype html>' + clone.outerHTML;
        });
        fs.writeFileSync(new URL('snapshot.html', out), html);
      }
    }
    if (phase === 'after') {
      await p.getByRole('button', { name: 'Notificações', exact: true }).click();
      await p.getByText('Nenhuma notificação nova.', { exact: true }).waitFor();
      await p.getByRole('menu').evaluate(el => Promise.all(el.getAnimations().map(a => a.finished.catch(() => {}))));
      await p.getByRole('menu').focus();
      await p.keyboard.press('Escape');
      await p.getByRole('menu').waitFor({ state: 'hidden' });
      if (width < 1100) {
        await p.getByRole('button', { name: 'Alternar menu de navegação', exact: true }).click();
        await p.getByRole('dialog', { name: 'Navegação Oriens' }).waitFor();
        await p.getByRole('dialog', { name: 'Navegação Oriens' }).evaluate(el => Promise.all(el.getAnimations().map(a => a.finished.catch(() => {}))));
        await p.keyboard.press('Escape');
        await p.getByRole('dialog', { name: 'Navegação Oriens' }).waitFor({ state: 'hidden' });
      }
      await p.locator('main > header nav').getByRole('link', { name: 'Projetos', exact: true }).click();
      await p.getByRole('heading', { level: 1, name: 'Projetos', exact: true }).waitFor();
      await p.locator('main > header nav [aria-current=page]').filter({ hasText: /^Projetos$/ }).waitFor();
    }
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(new URL('results.json', out), JSON.stringify({ phase, base, measurements, errors }, null, 2));
  console.log(`PASS ${phase}: ${measurements.length} viewport/sidebar combinations; ${phase === 'after' ? 'alignment, breadcrumbs, navigation, mobile menu, notifications and touch targets; ' : ''}no browser exceptions.`);
} catch (error) {
  if (p) {
    await p.screenshot({ path: new URL('failure.png', out).pathname });
    fs.writeFileSync(new URL('failure.html', out), await p.content());
    console.error(await p.locator('main > header').evaluate(el => el.outerHTML));
  }
  throw error;
} finally {
  await browser.close();
}
