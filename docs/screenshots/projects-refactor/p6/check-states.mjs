// Additional release states; request failures and empty projections are scoped to this browser.
import { chromium } from '../../../../oriens-front/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:4196';
const out=new URL('./states/',import.meta.url).pathname;fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
const results=[];
try {
 for(const width of [390,768,1024,1440]) {
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  await page.goto(base+'/projects');await page.getByRole('button',{name:'Novo projeto',exact:true}).waitFor();
  if(width<1100) {
   assert.equal(await page.locator('[data-mobile="true"]').count(),0);
   await page.getByRole('button',{name:'Alternar menu de navegação'}).focus();await page.keyboard.press('Enter');
   await page.getByRole('dialog',{name:'Navegação Oriens'}).waitFor();
   await page.getByRole('link',{name:'Hoje',exact:true}).focus();await page.keyboard.press('Enter');
   await page.getByRole('dialog',{name:'Navegação Oriens'}).waitFor({state:'hidden'});
   await page.getByRole('heading',{name:'Sem horário',exact:true}).waitFor();
  }
  await page.goto(base+'/tasks/project/30');await page.getByText('Nenhuma tarefa nesta coluna.',{exact:true}).first().waitFor();
  await page.screenshot({path:out+`empty-board-${width}.png`,fullPage:true});
  await page.goto(base+'/tasks/project/10');await page.getByRole('button',{name:'Publicar primeira versão',exact:true}).click();
  await page.getByLabel('Título',{exact:true}).fill('Rascunho preservado na concorrência');
  await page.route('**/api/task/3',route=>route.request().method()==='PATCH'?route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({code:'VERSION_CONFLICT',message:'Conflito de QA',fieldErrors:[]})}):route.continue());
  await page.getByRole('button',{name:'Salvar tarefa',exact:true}).click();
  await page.getByText(/Os dados mudaram em outra sessão/).waitFor();
  assert.equal(await page.getByLabel('Título',{exact:true}).inputValue(),'Rascunho preservado na concorrência');
  await page.getByRole('button',{name:'Recarregar dados',exact:true}).last().click();
  await page.getByText(/Dados recarregados. Revise o rascunho/).waitFor();
  assert.equal(await page.getByLabel('Título',{exact:true}).inputValue(),'Rascunho preservado na concorrência');
  await page.screenshot({path:out+`conflict-${width}.png`});
  // No save: the entire scenario leaves the fixture's stored data untouched.
  await page.goto(base+'/tasks/project/10');
  await page.route('**/api/project/10/board*',async route=>{
   const response=await route.fetch();const data=await response.json();
   data.tasks=data.tasks.filter(t=>t.status==='CANCELLED');
   const totals={totalTasks:data.tasks.length,nonCancelledTasks:0,completedTasks:0,cancelledTasks:data.tasks.length};
   data.total=totals;data.visible=totals;
   for(const column of data.columns){column.totalCount=data.tasks.filter(t=>t.columnId===column.id).length;column.visibleCount=column.totalCount;}
   await route.fulfill({response,json:data});
  });
  await page.route('**/api/project/10',async route=>{
   const response=await route.fetch();const data=await response.json();
   Object.assign(data.summary,{totalTasks:1,nonCancelledTasks:0,completedTasks:0,cancelledTasks:1,plannedTodayCount:0,previousPlansCount:0,overdueTaskCount:0,dueTodayTaskCount:0,nextPlannedTask:null});
   for(const objective of data.objectives)Object.assign(objective,{nonCancelledTasks:0,completedTasks:0,cancelledTasks:0});
   await route.fulfill({response,json:data});
  });
  await page.reload();await page.getByText('1 de 1 tarefas visíveis',{exact:true}).waitFor();
  assert.equal(await page.getByText(/100%/).count(),0);
  await page.screenshot({path:out+`only-cancelled-${width}.png`,fullPage:true});
  await page.unrouteAll({behavior:'wait'});
  await page.route('**/api/task/user/1?*',async route=>{
   const response=await route.fetch();const data=await response.json();
   if(data.planned){data.planned=[];data.previousPlans=[];data.deadlineAttention=[];data.completed=[];}
   await route.fulfill({response,json:data});
  });
  await page.goto(base+'/tasks');await page.getByText('Nenhuma tarefa sem horário.',{exact:true}).waitFor();
  await page.screenshot({path:out+`empty-day-${width}.png`,fullPage:true});
  assert.ok(await page.locator('body').evaluate(el=>el.scrollWidth<=innerWidth));
  results.push({width,navigation:true,emptyBoard:true,conflictDraftPreserved:true,onlyCancelled:true,emptyDay:true});await page.close();
 }
 fs.writeFileSync(out+'results.json',JSON.stringify(results,null,2));console.log('PASS: folded tablet navigation, empty board/day, only cancelled, 409 and explicit reload preserve draft.');
} finally {await browser.close();}
