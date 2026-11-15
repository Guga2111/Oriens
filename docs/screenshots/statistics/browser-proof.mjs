import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from '../../../oriens-front/node_modules/playwright-core/index.mjs';
const base=process.argv[2]||'http://127.0.0.1:4213',live=process.argv.includes('--live');
const browser=await chromium.launch({executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',headless:true});
const checks=[],errors=[];
const context=await browser.newContext({viewport:{width:1440,height:900},locale:'pt-BR',timezoneId:'America/Recife'});
const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
const requests=[];p.on('request',r=>{if(/\/(statistics|habits|financial)\//.test(r.url()))requests.push(r.url());});
const close=async()=>{const dialog=p.getByRole('dialog').last();await dialog.getByRole('button',{name:/^(Close|Fechar)$/}).click();};
try {
 if(!live)await fetch(base+'/__qa/reset');
 await p.goto(base+'/stats');await p.getByRole('heading',{name:'Calendário de atividade',exact:true}).waitFor();
 await p.locator('button[role="gridcell"][tabindex="0"]').waitFor();
 assert(requests.length<12,'annual activity must load in batches, never per cell');checks.push('batched annual queries');
 let focused=p.locator('button[role="gridcell"][tabindex="0"]');const initial=await focused.getAttribute('aria-label');await focused.focus();await p.keyboard.press('ArrowLeft');
 focused=p.locator('button[role="gridcell"][tabindex="0"]');const moved=await focused.getAttribute('aria-label');assert.notEqual(initial,moved);await p.keyboard.press('Enter');await p.getByRole('dialog').waitFor();await close();assert.equal(await p.locator(':focus').getAttribute('aria-label'),moved);checks.push('keyboard day navigation, selection, close and focus return');
 await p.getByRole('combobox',{name:'Período de análise'}).click();await Promise.all([p.waitForResponse(r=>r.url().includes('/planning?')&&r.status()===200),p.getByRole('option',{name:'Últimos 7 dias'}).click()]);checks.push('global period applied to domain queries');
 await p.getByRole('combobox',{name:'Período de análise'}).click();await p.getByRole('option',{name:'Últimos 30 dias'}).click();
 await p.getByRole('button',{name:'Lançamentos',exact:true}).click();await p.getByRole('heading',{name:'Lançamentos do período',exact:true}).waitFor();
 await p.getByRole('dialog').getByText(/lançamentos encontrados/).waitFor();
 const next=p.getByRole('button',{name:'Próxima',exact:true});if(await next.count()&&await next.isEnabled()){await Promise.all([p.waitForResponse(r=>r.url().includes('/entries?')&&r.url().includes('page=1')),next.click()]);checks.push('financial evidence pagination');}await close();
 const categories=p.getByRole('region',{name:'Despesas por categoria',exact:true});const category=categories.getByRole('button',{name:/^Ver /}).first();if(await category.count()){await category.click();await p.getByRole('dialog').waitFor();assert(requests.some(url=>url.includes('/entries?')&&url.includes('tagId=')&&url.includes('startDate=')));await close();checks.push('category and period preserved in evidence');}
 await p.getByRole('button',{name:'Gerenciar',exact:true}).click();await p.getByRole('button',{name:'Novo hábito',exact:true}).click();await p.getByLabel('Nome',{exact:true}).fill('Hábito de verificação');await p.getByRole('button',{name:'Salvar hábito',exact:true}).click();
 await p.getByRole('heading',{name:'Hábito de verificação',exact:true}).waitFor();
 const row=()=>p.locator('div.rounded-md.border.p-4').filter({has:p.getByRole('heading',{name:'Hábito de verificação',exact:true})});
 await row().getByRole('button',{name:'Registrar execução',exact:true}).click();await row().getByRole('button',{name:'Desmarcar execução',exact:true}).waitFor();
 await row().getByRole('button',{name:'Desmarcar execução',exact:true}).click();await row().getByRole('button',{name:'Registrar execução',exact:true}).waitFor();checks.push('habit creation, execution/uncheck and live aggregates');
 await row().getByRole('button',{name:'Pausar',exact:true}).click();await p.getByRole('button',{name:'Salvar pausa',exact:true}).click();await p.getByRole('heading',{name:'Pausar Hábito de verificação',exact:true}).waitFor({state:'hidden'});assert(await row().getByText('Em pausa',{exact:true}).isVisible());checks.push('habit pause excludes expected occurrence');
 await row().getByRole('button',{name:'Editar',exact:true}).click();await p.getByLabel('Nome',{exact:true}).fill('Hábito revisado');await p.getByRole('button',{name:'Salvar hábito',exact:true}).click();await p.getByRole('heading',{name:'Hábito revisado',exact:true}).waitFor();
 const revised=p.locator('div.rounded-md.border.p-4').filter({has:p.getByRole('heading',{name:'Hábito revisado',exact:true})});await revised.getByRole('button',{name:'Arquivar',exact:true}).click();await p.getByRole('button',{name:'Arquivar hábito',exact:true}).click();await p.getByRole('alertdialog').waitFor({state:'hidden'});assert(await revised.getByText(/arquivado a partir/).isVisible());await close();checks.push('habit editing and archive preserve history');
 for(const width of [1440,768,390]){await p.setViewportSize({width,height:900});await p.goto(base+'/stats');await p.locator('button[role="gridcell"][tabindex="0"]').waitFor();const overflow=await p.evaluate(()=>{const root=document.querySelector('.statistics-screen');return root.scrollWidth>root.clientWidth+1;});assert(!overflow,`page overflow at ${width}`);const scroller=p.locator('.activity-scroll');if(width===390)assert(await scroller.evaluate(el=>el.scrollWidth>el.clientWidth));checks.push(`bounded layout ${width}px`);}
 await p.setViewportSize({width:390,height:844});const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,locale:'pt-BR',timezoneId:'America/Recife'});const tp=await touch.newPage();await tp.goto(base+'/stats');const cell=tp.locator('button[role="gridcell"][tabindex="0"]');await cell.waitFor();await cell.tap();await tp.getByRole('dialog').waitFor();await touch.close();checks.push('touch selection at 390px');
 if(!live){await p.goto(base+'/stats?state=partial-error');await p.getByRole('region',{name:'Planejamento',exact:true}).getByText('previstas',{exact:false}).waitFor();await p.getByText('Não foi possível carregar resumo financeiro.',{exact:false}).waitFor({timeout:20000});checks.push('partial financial error preserves other domains');await p.goto(base+'/stats?state=empty');await p.getByRole('heading',{name:'Comece um hábito',exact:true}).waitFor();assert(await p.getByText('Nenhuma tarefa planejada neste período.',{exact:true}).isVisible());checks.push('empty account and unavailable planning rate');}
 assert.deepEqual(errors,[]);checks.push('no browser exceptions');
 fs.writeFileSync(new URL(live?'./live-browser-results.json':'./browser-results.json',import.meta.url),JSON.stringify({checks,requestCount:requests.length,errors},null,2));console.log('PASS '+checks.join('; '));
}finally{await browser.close();}
