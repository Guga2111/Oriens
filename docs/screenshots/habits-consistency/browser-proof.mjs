import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from '../../../apps/client/node_modules/playwright-core/index.mjs';
const base=process.argv[2]||'http://127.0.0.1:4213',live=process.argv.includes('--live');
const browser=await chromium.launch({executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',headless:true});
const checks=[],errors=[];
const context=await browser.newContext({viewport:{width:1440,height:900},locale:'pt-BR',timezoneId:'America/Recife'});
const p=await context.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));
const requests=[];p.on('request',r=>{if(/\/(statistics|habits|financial)\//.test(r.url()))requests.push(r.url());});
const close=async()=>{const dialog=p.getByRole('dialog').last();await dialog.getByRole('button',{name:/^(Close|Fechar)$/}).click();};
try {
 if(!live)await fetch(base+'/__qa/reset');
 await p.goto(base+'/stats');await p.getByRole('heading',{name:'Calendário de atividade',exact:true}).waitFor();
 await p.locator('button[role="gridcell"][tabindex="0"]').waitFor();
 const streak=p.getByRole('button',{name:/^Sequência de atividade:/});await streak.waitFor();const streakLabel=await streak.getAttribute('aria-label');assert(!streakLabel.includes('indisponível'));
 await streak.focus();await p.keyboard.press('Enter');await p.getByRole('dialog',{name:'Como funciona a sequência de atividade',exact:true}).waitFor();await p.getByRole('dialog',{name:'Como funciona a sequência de atividade',exact:true}).evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));await p.keyboard.press('Escape');await p.getByRole('dialog',{name:'Como funciona a sequência de atividade',exact:true}).waitFor({state:'hidden'});await p.waitForFunction(label=>document.activeElement?.getAttribute('aria-label')===label,streakLabel);assert.equal(await p.locator(':focus').getAttribute('aria-label'),streakLabel);checks.push('streak opens by keyboard and returns focus');
 assert(requests.length<12,'annual activity must load in batches, never per cell');checks.push('batched annual queries');
 let focused=p.locator('button[role="gridcell"][tabindex="0"]');const initial=await focused.getAttribute('aria-label');await focused.focus();await p.keyboard.press('ArrowLeft');
 focused=p.locator('button[role="gridcell"][tabindex="0"]');const moved=await focused.getAttribute('aria-label');assert.notEqual(initial,moved);await p.keyboard.press('Enter');await p.getByRole('dialog').waitFor();await close();assert.equal(await p.locator(':focus').getAttribute('aria-label'),moved);checks.push('keyboard day navigation, selection, close and focus return');
 await p.getByRole('combobox',{name:'Período de análise'}).click();await Promise.all([p.waitForResponse(r=>r.url().includes('/planning?')&&r.status()===200),p.getByRole('option',{name:'Últimos 7 dias'}).click()]);assert.equal(await streak.getAttribute('aria-label'),streakLabel);checks.push('global period applied to domain queries; current streak stays independent');
 await p.getByRole('combobox',{name:'Período de análise'}).click();await p.getByRole('option',{name:'Últimos 30 dias'}).click();
 await p.getByRole('button',{name:'Lançamentos',exact:true}).click();await p.getByRole('heading',{name:'Lançamentos do período',exact:true}).waitFor();
 await p.getByRole('dialog').getByText(/lançamentos encontrados/).waitFor();
 const next=p.getByRole('button',{name:'Próxima',exact:true});if(await next.count()&&await next.isEnabled()){await Promise.all([p.waitForResponse(r=>r.url().includes('/entries?')&&r.url().includes('page=1')),next.click()]);checks.push('financial evidence pagination');}await close();
 const categories=p.getByRole('region',{name:'Despesas por categoria',exact:true});const category=categories.getByRole('button',{name:/^Ver /}).first();if(await category.count()){await category.click();await p.getByRole('dialog').waitFor();assert(requests.some(url=>url.includes('/entries?')&&url.includes('tagId=')&&url.includes('startDate=')));await close();checks.push('category and period preserved in evidence');}
 const streakReads=requests.filter(url=>url.endsWith('/streak')).length;
 await p.getByRole('button',{name:'Gerenciar',exact:true}).click();await p.getByRole('button',{name:'Novo hábito',exact:true}).click();await p.getByLabel('Nome',{exact:true}).fill('Hábito de verificação');await p.getByRole('button',{name:'Salvar hábito',exact:true}).click();
 await p.getByRole('heading',{name:'Hábito de verificação',exact:true}).waitFor();
 const row=()=>p.locator('div.rounded-md.border.p-4').filter({has:p.getByRole('heading',{name:'Hábito de verificação',exact:true})});
 await row().getByRole('button',{name:'Registrar execução',exact:true}).click();await row().getByRole('button',{name:'Desmarcar execução',exact:true}).waitFor();
 await row().getByRole('button',{name:'Desmarcar execução',exact:true}).click();await row().getByRole('button',{name:'Registrar execução',exact:true}).waitFor();assert(requests.filter(url=>url.endsWith('/streak')).length>streakReads);checks.push('habit creation, execution/uncheck refresh aggregates and streak');
 await row().getByRole('button',{name:'Pausar',exact:true}).click();await p.getByRole('button',{name:'Salvar pausa',exact:true}).click();await p.getByRole('heading',{name:'Pausar Hábito de verificação',exact:true}).waitFor({state:'hidden'});assert(await row().getByText('Em pausa',{exact:true}).isVisible());checks.push('habit pause excludes expected occurrence');
 await row().getByRole('button',{name:'Editar',exact:true}).click();await p.getByLabel('Nome',{exact:true}).fill('Hábito revisado');await p.getByRole('button',{name:'Salvar hábito',exact:true}).click();await p.getByRole('heading',{name:'Hábito revisado',exact:true}).waitFor();
 const revised=p.locator('div.rounded-md.border.p-4').filter({has:p.getByRole('heading',{name:'Hábito revisado',exact:true})});await revised.getByRole('button',{name:'Arquivar',exact:true}).click();await p.getByRole('button',{name:'Arquivar hábito',exact:true}).click();await p.getByRole('alertdialog').waitFor({state:'hidden'});assert(await revised.getByText(/arquivado a partir/).isVisible());await close();checks.push('habit editing and archive preserve history');
 for(const width of [1440,768,390]){await p.setViewportSize({width,height:900});await p.goto(base+'/stats');await p.locator('button[role="gridcell"][tabindex="0"]').waitFor();const overflow=await p.evaluate(()=>{const root=document.querySelector('.statistics-screen');return root.scrollWidth>root.clientWidth+1;});assert(!overflow,`page overflow at ${width}`);const scroller=p.locator('.activity-scroll');if(width===390)assert(await scroller.evaluate(el=>el.scrollWidth>el.clientWidth));checks.push(`bounded layout ${width}px`);}
 await p.setViewportSize({width:390,height:844});const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,locale:'pt-BR',timezoneId:'America/Recife'});const tp=await touch.newPage();await tp.goto(base+'/stats');await tp.getByRole('button',{name:/^Sequência de atividade:/}).tap();await tp.getByRole('dialog',{name:'Como funciona a sequência de atividade',exact:true}).waitFor();await tp.getByRole('dialog',{name:'Como funciona a sequência de atividade',exact:true}).evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));await tp.keyboard.press('Escape');await tp.getByRole('dialog',{name:'Como funciona a sequência de atividade',exact:true}).waitFor({state:'hidden'});const cell=tp.locator('button[role="gridcell"][tabindex="0"]');await cell.waitFor();await cell.tap();await tp.getByRole('dialog').waitFor();await touch.close();checks.push('streak and calendar touch selection at 390px');

 await fetch(base+'/__qa/reset');
 for(const theme of ['light','dark'])for(const width of [1440,768,390]){
  await p.setViewportSize({width,height:900});await p.goto(base+'/stats?theme='+theme);await p.locator('.habit-matrix abbr').last().waitFor();
  const matrix=p.locator('.habit-matrix');
  assert(await matrix.evaluate(el=>el.scrollWidth<=el.clientWidth+1),`habit matrix overflow ${theme} ${width}`);
  await p.getByRole('region',{name:'Hábitos',exact:true}).screenshot({path:new URL(`./${theme}-${width}-matrix.png`,import.meta.url).pathname});
  const seen=new Set();const prev=p.getByRole('button',{name:'Dias anteriores dos hábitos'}),next=p.getByRole('button',{name:'Próximos dias dos hábitos'});
  for(;;){for(const title of await matrix.locator('abbr').evaluateAll(els=>els.map(el=>el.title)))seen.add(title);if(await prev.isDisabled())break;await prev.click();}
  assert.equal(seen.size,30);while(await next.isEnabled())await next.click();
  await p.getByRole('button',{name:'Gerenciar',exact:true}).click();const sheet=p.getByRole('dialog',{name:'Hábitos',exact:true});await sheet.getByRole('heading',{name:'Ler por 20 minutos',exact:true}).waitFor();
  for(const label of ['Editar','Pausar','Arquivar'])assert(await sheet.getByRole('button',{name:label,exact:true}).first().locator('svg').count());
  await sheet.screenshot({path:new URL(`./${theme}-${width}-manager.png`,import.meta.url).pathname});
  await p.getByRole('button',{name:/^Data de execução:/}).click();const calendar=p.getByRole('dialog').last();assert.equal(await calendar.locator('input[type=date]').count(),0);assert(await calendar.locator('button[name=day]').count());
  const day=calendar.locator('button[name=day]').filter({hasText:/^16$/});assert(await day.isDisabled());
  await calendar.screenshot({path:new URL(`./${theme}-${width}-calendar.png`,import.meta.url).pathname});await p.keyboard.press('Escape');
  await p.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')?.startsWith('Data de execução:'));
  await p.getByRole('button',{name:'Novo hábito',exact:true}).click();const editor=p.getByRole('dialog',{name:'Novo hábito',exact:true});
  const monday=editor.getByRole('button',{name:'Segunda',exact:true}),tuesday=editor.getByRole('button',{name:'Terça',exact:true});
  assert.equal(await monday.getAttribute('aria-pressed'),'true');await monday.click();assert.equal(await monday.getAttribute('aria-pressed'),'false');
  await p.waitForFunction(()=>getComputedStyle(document.querySelector('button[aria-label=Segunda]')).backgroundColor!==getComputedStyle(document.querySelector('button[aria-label=Terça]')).backgroundColor);await monday.evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
  assert.equal(await editor.locator('input[type=date]').count(),0);await editor.screenshot({path:new URL(`./${theme}-${width}-editor.png`,import.meta.url).pathname});
  await editor.getByRole('button',{name:/^Começar em:/}).click();const startPicker=p.getByRole('dialog').last();assert(await startPicker.locator('button[name=day]').filter({hasText:/^14$/}).isDisabled());
  const sizes=await startPicker.locator('button[name=day]').first().evaluate(el=>({button:el.getBoundingClientRect().width,cell:el.parentElement.getBoundingClientRect().width}));assert.equal(sizes.button,sizes.cell);
  await p.keyboard.press('Escape');await editor.getByRole('button',{name:'Cancelar',exact:true}).click();await close();
  await p.getByRole('button',{name:'Consultar atividade por data',exact:true}).click();const lookup=p.getByRole('dialog').last();await lookup.locator('button[name=day]:not(.day-outside)').filter({hasText:/^15$/}).click();await p.getByRole('dialog').getByText(/data real de conclusão e execução/).waitFor();await close();assert.equal(await p.locator(':focus').getAttribute('role'),'gridcell');
  checks.push(`matrix paging covers all 30 days; shadcn controls, date bounds, selection contrast and focus ${theme} ${width}px`);
 }
 if(!live){await p.goto(base+'/stats?state=partial-error');await p.getByRole('region',{name:'Planejamento',exact:true}).getByText('previstas',{exact:false}).first().waitFor();await p.getByText('Não foi possível carregar resumo financeiro.',{exact:false}).waitFor({timeout:20000});checks.push('partial financial error preserves other domains');await p.goto(base+'/stats?state=empty');await p.getByRole('heading',{name:'Comece um hábito',exact:true}).waitFor();assert(await p.getByText('Nenhuma tarefa planejada neste período.',{exact:true}).isVisible());checks.push('empty account and unavailable planning rate');}
 assert.deepEqual(errors,[]);checks.push('no browser exceptions');
 fs.writeFileSync(new URL(live?'./live-browser-results.json':'./browser-results.json',import.meta.url),JSON.stringify({checks,requestCount:requests.length,errors},null,2));console.log('PASS '+checks.join('; '));
}catch(error){console.log('DIALOGS',await p.getByRole('dialog').evaluateAll(els=>els.map(el=>el.textContent)));console.log('ERRORS',errors);await p.screenshot({path:new URL('./failure.png',import.meta.url).pathname});throw error;}finally{await browser.close();}
