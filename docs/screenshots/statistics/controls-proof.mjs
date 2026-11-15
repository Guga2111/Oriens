import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from '../../../oriens-front/node_modules/playwright-core/index.mjs';
const base=process.argv[2]||'http://127.0.0.1:4215',checks=[];
const browser=await chromium.launch({executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',headless:true});
try{
 const p=await browser.newPage({viewport:{width:1440,height:900},locale:'pt-BR',timezoneId:'America/Recife'});const requests=[];
 p.on('request',r=>requests.push(r.url()));await p.goto(base+'/stats');await p.locator('button[role=gridcell][tabindex="0"]').waitFor();
 await p.getByRole('button',{name:/Escolher intervalo:/}).click();const pop=p.getByRole('dialog');
 await pop.locator('button[name=day]:not(.day-outside)').filter({hasText:/^20$/}).click();
 await pop.locator('button[name=day]:not(.day-outside)').filter({hasText:/^25$/}).click();
 const response=await Promise.all([p.waitForResponse(r=>r.url().includes('/planning?')&&r.status()===200),pop.getByRole('button',{name:'Aplicar período',exact:true}).click()]);
 const applied=new URL(response[0].url());assert(applied.searchParams.get('startDate').endsWith('-20'));assert(applied.searchParams.get('endDate').endsWith('-25'));checks.push('custom range applied only by explicit Apply');
 const annual=p.getByRole('region',{name:'Calendário de atividade',exact:true});const original=await annual.getByText(/^Janela própria/).textContent();const count=requests.filter(u=>u.includes('/planning?')).length;
 await Promise.all([p.waitForResponse(r=>r.url().includes('/activity?')&&r.status()===200),p.getByRole('button',{name:'Recuar janela anual um mês',exact:true}).click()]);
 assert.notEqual(await annual.getByText(/^Janela própria/).textContent(),original);assert.equal(requests.filter(u=>u.includes('/planning?')).length,count);checks.push('annual navigation independent from global period');
 await p.getByRole('button',{name:'Consultar atividade por data',exact:true}).click();
 const input=p.getByLabel('Consultar atividade de uma data',{exact:true});const selected=await input.getAttribute('max');await input.fill(selected);await p.getByRole('dialog').getByText(/data real de conclusão e execução/).waitFor();
 await p.getByRole('dialog').getByRole('button',{name:/^(Close|Fechar)$/}).click();assert.equal(await p.locator(':focus').getAttribute('role'),'gridcell');checks.push('date lookup opens evidence and restores grid focus');
 await p.getByRole('button',{name:'Avançar janela anual um mês',exact:true}).click();await annual.getByText(original,{exact:true}).waitFor();checks.push('annual forward returns to original window');
 await p.getByRole('button',{name:'Ver valores em tabela',exact:true}).click();await p.getByRole('columnheader',{name:'Receitas',exact:true}).waitFor();checks.push('financial chart has working textual table');
 const categories=p.getByRole('region',{name:'Despesas por categoria',exact:true}),all=categories.getByRole('button',{name:/Mostrar todas/});
 if(await all.count()){await all.click();await categories.getByRole('button',{name:'Mostrar cinco categorias',exact:true}).waitFor();assert.equal(await categories.locator('button[aria-label^="Ver "]').count(),6);checks.push('category expansion preserves all computed totals');}
 fs.writeFileSync(new URL('./controls-results.json',import.meta.url),JSON.stringify({checks},null,2));console.log('PASS '+checks.join('; '));
}finally{await browser.close();}
