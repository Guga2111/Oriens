import { chromium } from '../../../../oriens-front/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:4185';
const out=new URL('./',import.meta.url).pathname;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
const results=[];
try {
 for(const width of [1440,768,390,360,1024]) for(const theme of ['light','dark']) {
  await fetch(base+'/__qa/reset',{method:'POST'});
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce',timezoneId:'Pacific/Auckland'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const capture=async name=>{assert.ok(await page.locator('body').evaluate(el=>el.scrollWidth<=innerWidth),`${name}: overflow ${width}`);await page.screenshot({path:out+`${name}-${theme}-${width}.png`,fullPage:true});};
  await page.goto(base+`/tasks?theme=${theme}`);await page.locator('#task-row-2').waitFor();await page.waitForFunction(t=>document.documentElement.classList.contains(t),theme);await capture('day');
  assert.equal(await page.locator('#task-row-6').count(),0);
  const marker=page.getByRole('button',{name:'09:30, 2 tarefas'});await marker.focus();await page.keyboard.press('Enter');
  await page.getByRole('menuitem',{name:/Revisar texto de apresentação/}).focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.activeElement?.id==='task-row-8');
  const check=page.locator('#task-row-8').getByRole('checkbox');await check.focus();await page.keyboard.press('Space');
  await page.locator('#task-row-8').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Concluídas (2)'}).click();await page.locator('#task-row-8').waitFor();
  await capture('completed');
  await page.getByRole('radio',{name:'Ver semana'}).click();await page.getByText('Revisar pendências em Hoje',{exact:true}).waitFor();await page.locator('text=Confirmar domínio disponível').waitFor({state:'hidden'});await capture('week');
  await page.getByRole('button',{name:'Próxima semana'}).click();await page.getByRole('button',{name:'Revisar pendências em Hoje'}).click();await page.locator('#task-row-5').waitFor();
  await page.locator('#task-row-5').getByRole('button',{name:/Ações da tarefa/}).click();const patch=page.waitForRequest(r=>r.method()==='PATCH'&&r.url().endsWith('/task/5'));
  await page.getByRole('menuitem',{name:'Fazer hoje',exact:true}).click();const body=(await patch).postDataJSON();assert.equal(body.startTime,null);assert.equal(Object.hasOwn(body,'dueDate'),false);assert.equal(Object.hasOwn(body,'status'),false);
  await page.locator('#task-row-5').getByText('Sem horário',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Próximo dia',exact:true}).click();await page.getByRole('heading',{name:'Pendentes de dias anteriores',exact:true}).waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);results.push({width,theme,overflow:false,errors});await page.close();
 }
 fs.writeFileSync(out+'browser-results.json',JSON.stringify({results,coincidentKeyboardFocus:true,completed:true,weekNavigation:true,minimalPlanningPatch:true},null,2));
 console.log('PASS P5 browser: day/completed/week, light/dark 1440/768/390/360/1024, keyboard timeline, planning, no page overflow or JS errors.');
}finally{await fetch(base+'/__qa/reset',{method:'POST'});await browser.close();}
