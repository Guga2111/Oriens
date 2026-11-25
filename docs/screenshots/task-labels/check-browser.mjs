import { chromium } from '../../../apps/client/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = process.argv[2] || 'http://127.0.0.1:4201';
const out = new URL('./browser/', import.meta.url).pathname; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' });
const results = [];
try {
  for (const width of [1440,768,390,360]) for (const theme of ['light','dark']) {
    await fetch(base+'/__qa/reset', { method: 'POST' });
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce', timezoneId: 'Pacific/Auckland' }); page.setDefaultTimeout(12000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const capture = async state => {
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${state} overflow at ${width}`);
      await page.screenshot({ path: out+`${state}-${theme}-${width}.png` });
    };
    await page.goto(`${base}/tasks/project/10?theme=${theme}`);
    await page.waitForFunction(t => document.documentElement.classList.contains(t),theme);
    await page.getByRole('button', { name: 'Publicar primeira versão', exact: true }).click();
    await page.locator('#task-labels').click();
    await page.getByRole('checkbox', { name: 'Frontend', exact: true }).check();
    const check = await page.getByRole('checkbox', { name: 'Pesquisa', exact: true }).boundingBox(); assert.equal(check.width,check.height);
    await page.getByRole('checkbox', { name: 'Pesquisa', exact: true }).check(); await capture('picker');
    await page.getByRole('button', { name: 'Criar etiqueta', exact: true }).click();
    await page.waitForFunction(el => el === document.activeElement, await page.getByLabel('Nome da etiqueta', { exact: true }).elementHandle());
    await page.getByLabel('Nome da etiqueta', { exact: true }).fill('Entrega');
    await page.getByRole('radio', { name: 'Verde', exact: true }).click(); await capture('label-editor');
    await page.getByRole('button', { name: 'Salvar etiqueta', exact: true }).click();
    await page.getByRole('button', { name: 'Remover etiqueta Entrega desta tarefa', exact: true }).waitFor();
    const patch = page.waitForResponse(r => r.request().method() === 'PATCH' && r.url().endsWith('/task/3'));
    await page.getByRole('button', { name: 'Salvar tarefa', exact: true }).click();
    const response = await patch; assert.equal(response.status(),200); const saved = (await response.json()).task;
    assert.equal(saved.labels.length,3); assert.equal(saved.dueDate,'2026-11-23'); assert.equal(saved.status,'PENDING');
    await page.getByRole('dialog', { name: 'Editar tarefa', exact: true }).waitFor({ state: 'hidden' });
    await page.getByText('Entrega', { exact: true }).waitFor(); await capture('board');
    await page.getByRole('button', { name: 'Publicar primeira versão', exact: true }).click(); await page.locator('#task-labels').click();
    await page.getByRole('button', { name: 'Editar etiqueta Entrega', exact: true }).click(); await capture('label-edit');
    await page.getByLabel('Nome da etiqueta', { exact: true }).fill('Publicação');
    await page.getByRole('button', { name: 'Salvar etiqueta', exact: true }).click();
    await page.getByRole('dialog', { name: 'Editar etiqueta', exact: true }).waitFor({ state: 'hidden' });
    await page.locator('#task-labels').click(); await page.getByRole('button', { name: 'Editar etiqueta Publicação', exact: true }).click();
    await page.getByRole('button', { name: 'Excluir etiqueta', exact: true }).click();
    const confirm = page.getByRole('alertdialog'); await confirm.getByText(/todas as suas tarefas/).waitFor(); await capture('confirmation');
    await confirm.getByRole('button', { name: 'Excluir etiqueta', exact: true }).click();
    await page.getByRole('dialog', { name: 'Editar etiqueta', exact: true }).waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('button', { name: 'Remover etiqueta Publicação desta tarefa', exact: true }).count(),0);
    // The global removal is committed already; it must not cause a discard prompt by itself.
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.getByRole('dialog', { name: 'Editar tarefa', exact: true }).waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('alertdialog').count(),0);
    assert.deepEqual(errors,[]); results.push({width,theme,multipleSelection:true,create:true,rename:true,delete:true,overflow:false,errors});
    console.log(`PASS ${width}/${theme}`); await page.close();
  }
  // A maximal unbroken name must wrap in the picker, selected list and board.
  await fetch(base+'/__qa/reset', { method: 'POST' });
  const page = await browser.newPage({ viewport: { width: 360, height: 900 }, reducedMotion: 'reduce' });
  const name = 'W'.repeat(50);
  await page.goto(`${base}/tasks/project/10`);
  await page.getByRole('button', { name: 'Publicar primeira versão', exact: true }).click();
  await page.locator('#task-labels').click();
  await page.getByRole('button', { name: 'Criar etiqueta', exact: true }).click();
  await page.getByLabel('Nome da etiqueta', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Salvar etiqueta', exact: true }).click();
  await page.getByRole('button', { name: `Remover etiqueta ${name} desta tarefa`, exact: true }).waitFor();
  const assertFits = async () => assert.ok(await page.evaluate(() =>
    document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('[role="dialog"], [role="dialog"] li, [role="dialog"] fieldset, [data-radix-scroll-area-viewport]')].every(el => el.scrollWidth <= el.clientWidth + 1)));
  await assertFits(); await page.locator('#task-labels').click();
  await page.getByRole('checkbox', { name, exact: true }).waitFor(); await assertFits();
  await page.screenshot({ path: out+'long-name-360.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Salvar tarefa', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByText(name, { exact: true }).waitFor(); await assertFits();
  results.push({width:360,maximalUnbrokenName:true,overflow:false}); await page.close();
  fs.writeFileSync(out+'results.json',JSON.stringify(results,null,2));
} finally { await browser.close(); }
