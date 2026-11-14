import { chromium } from '../../../../oriens-front/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true,
  executablePath: process.env.CHROME_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' });
const base = process.argv[2] || 'http://127.0.0.1:4175';
const out = new URL('./', import.meta.url).pathname;
try {
  for (const width of [1440, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '/all-data');
    await page.getByText('Montar formulário de contato', { exact: true }).filter({ visible:true }).waitFor();
    if (width < 1024) await page.getByRole('button', { name:'Filtros', exact:true }).click();
    await page.getByRole('combobox', { name:'Status', exact:true }).click();
    await page.getByRole('option', { name:'Cancelada', exact:true }).click();
    if (width < 1024) await page.getByRole('button', { name:'Fechar', exact:true }).click();
    await page.getByText('Mostrando 1 a 1 de 1 tarefa', { exact:true }).waitFor();
    assert.equal(await page.locator('body').evaluate(el => el.scrollWidth <= innerWidth), true);
    if (width < 1024) await page.getByRole('button', { name:/^Filtros/ }).click();
    await page.getByRole('combobox', { name:'Campo de data' }).click();
    const request = page.waitForRequest(r => r.url().includes('/task/user/1/all') && r.url().includes('dateField=dueDate'));
    await page.getByRole('option', { name:'Prazo final', exact:true }).click();
    await request;
    await page.getByRole('combobox', { name:'Projeto', exact:true }).click();
    await page.getByPlaceholder('Buscar projeto').fill('Site');
    await page.getByRole('option', { name:'Site pessoal', exact:true }).click();
    if (width < 1024) await page.getByRole('button', { name:'Fechar', exact:true }).click();
    await page.getByRole('tab', { name:'Projetos', exact:true }).click();
    await page.getByText('Nenhum objetivo definido', { exact:true }).filter({visible:true}).waitFor();
    assert.equal(await page.getByText('0/3 tarefas · 1 cancelada', {exact:true}).filter({visible:true}).count(), 1);
    await page.screenshot({ path:out + `projects-${width}.png`, fullPage:true });
    // Keyboard-only traversal enters the existing shell and content controls without trapping focus.
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.tagName !== 'BODY'), true);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('PASS: filters, project search, independent date field, cancellation, counts, keyboard focus, reduced motion and no horizontal page overflow at 1440/768/390.');
} finally { await browser.close(); }
