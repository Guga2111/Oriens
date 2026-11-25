import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from '../../../apps/client/node_modules/playwright-core/index.mjs';
const base=process.argv[2]||'http://127.0.0.1:4221',checks=[],errors=[];
const browser=await chromium.launch({executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',headless:true});
const summary={totalObjectives:0,completedObjectives:0,totalTasks:0,nonCancelledTasks:0,completedTasks:0,cancelledTasks:0,plannedTodayCount:0,previousPlansCount:0,overdueTaskCount:0,dueTodayTaskCount:0,overdueObjectiveCount:0,nextPlannedTask:null,nextObjective:null};
const project={id:9,userId:1,title:'Projeto de revisão',description:null,color:null,imageUrl:null,mode:'SIMPLE',version:1,favorite:false,archived:false,lastAccessed:null,defaultPendingColumnId:null,defaultCompletedColumnId:null,objectives:[],summary};
const page={content:[],number:0,size:20,totalElements:0,totalPages:0,first:true,last:true};
try{
 const p=await browser.newPage({locale:'pt-BR',timezoneId:'America/Recife'});p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/api/**',async route=>{
  const u=new URL(route.request().url()),path=u.pathname.replace(/^\/api/,'');let data;
  if(path==='/user/1')data={id:1,name:'Conta de revisão',email:'review@example.invalid',role:'ADMIN'};
  else if(path==='/project/9')data=project;
  else if(path==='/project/user/1/summary')data={totalProjects:0,activeProjects:0,favoriteProjects:0,archivedProjects:0};
  else if(path==='/project/user/1')data=page;
  else if(path==='/task/user/1/all')data={...page,content:[{id:42,userId:1,title:'Concluir curso',description:null,projectId:null,objectiveId:null,columnId:null,position:null,plannedDate:'2026-11-15',startTime:null,dueDate:null,completedAt:'2026-11-15',createdAt:'2026-11-15T12:00:00Z',priority:'MEDIUM',status:'CONCLUDED',location:null,version:1,project:null,objective:null,column:null,labels:[]}],totalElements:1,totalPages:1};
  else if(path==='/task/user/1')data={date:u.searchParams.get('date'),timezone:'America/Recife',planned:[],previousPlans:[],deadlineAttention:[],completed:[]};
  else if(path.endsWith('/summary/weekly-counts'))data={startDate:u.searchParams.get('startDate'),endDate:u.searchParams.get('endDate'),timezone:'America/Recife',completedTasks:0,totalTasks:0};
  else if(path.includes('/tags')||path.includes('/task-label')||path==='/user/admin/all-users'||path==='/support/admin/tickets'||path.endsWith('/entries/recurring'))data=[];
  else if(path.endsWith('/entries/count'))data=0;
  else if(path==='/support/admin/stats')data={totalTickets:0,openTickets:0,inProgressTickets:0,closedTickets:0,averageResolutionTime:0};
  if(data!==undefined)return route.fulfill({json:data});return route.continue();
 });

 const routes=['/tasks','/projects','/stats','/config','/tasks/project/9','/tasks/project/invalid','/financial','/all-data','/support','/admin/support','/admin/management'];
 const measurements=[];
 for(const width of [390,768,1024,1440,1920,2560]){
  await p.setViewportSize({width,height:1000});const expected=width<768?16:width<1024?32:64, vertical=width<768?16:32;
  for(const sidebar of width>=1100?['expanded','collapsed']:['mobile'])for(const path of routes){
   await p.goto(base+path);const frame=p.locator('[data-page-content]');await frame.waitFor();await p.getByRole('heading',{level:1}).first().waitFor();
   if(sidebar!=='mobile'){
    const nav=p.locator('div[data-variant][data-side][data-state]');
    if(await nav.getAttribute('data-state')!==sidebar){await p.getByRole('button',{name:'Alternar menu de navegação',exact:true}).click();await nav.evaluate(el=>Promise.all(el.getAnimations({subtree:true}).filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));}
   }
   const metrics=await frame.evaluate(el=>{
    const css=getComputedStyle(el),box=el.getBoundingClientRect(),child=el.firstElementChild,root=child.getBoundingClientRect(),section=child.firstElementChild.getBoundingClientRect(),heading=el.querySelector('h1').getBoundingClientRect();
    return{padding:[css.paddingTop,css.paddingRight,css.paddingBottom,css.paddingLeft].map(parseFloat),innerWidth:el.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight),rootWidth:root.width,sectionWidth:section.width,left:heading.left-box.left,rootLeft:root.left-box.left,right:box.right-root.right,overflow:el.scrollWidth>el.clientWidth+1};
   });
   assert.deepEqual(metrics.padding,[vertical,expected,vertical,expected],`${path} padding ${width} ${sidebar}`);
   assert(Math.abs(metrics.rootWidth-metrics.innerWidth)<1,`${path} root width ${JSON.stringify(metrics)}`);
   assert(Math.abs(metrics.sectionWidth-metrics.innerWidth)<1,`${path} inner width cap ${JSON.stringify(metrics)}`);
   assert(Math.abs(metrics.left-expected)<1,`${path} heading left ${width}`);assert(Math.abs(metrics.right-expected)<1,`${path} right edge ${width}`);assert(!metrics.overflow,`${path} overflow ${width}`);
   if(path==='/all-data'||path==='/stats'){
    const card=path==='/stats'?p.getByRole('region',{name:'Calendário de atividade',exact:true}):p.locator('[data-page-content] .rounded-lg.border.bg-card').first();await card.waitFor();
    const actual=await card.evaluate(el=>el.getBoundingClientRect().width);assert(Math.abs(actual-metrics.innerWidth)<1,`${path} panel width ${width} ${sidebar}`);
    if([390,1920,2560].includes(width)){await p.screenshot({path:new URL(`./${width}-${sidebar}-${path.slice(1)}.png`,import.meta.url).pathname});}
   }
   measurements.push({path,width,sidebar,...metrics});checks.push(`${path} ${width} ${sidebar}: equal ${expected}px gutters, full-width content`);
  }
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(new URL('./browser-results.json',import.meta.url),JSON.stringify({checks,measurements,errors},null,2));
 console.log(`PASS: ${checks.length} route/frame checks at 390, 768, 1024, 1440, 1920 and 2560px; expanded/collapsed sidebar; no browser exceptions`);
}catch(error){console.log('ERRORS',errors);throw error;}finally{await browser.close();}
