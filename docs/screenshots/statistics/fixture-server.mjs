// Synthetic QA only. Optional proxy connects exclusively to an explicitly supplied disposable API.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.argv[2] || 'apps/client/dist');
const port = Number(process.argv[3] || 4213);
const instant = process.env.QA_NOW || '2026-11-15T15:00:00Z';
const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Recife',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(instant));
const add = (date,n) => {const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const span = (a,b) => {const out=[];for(let d=a;d<=b;d=add(d,1))out.push(d);return out;};
const weekday = d => (new Date(d+'T12:00:00Z').getUTCDay()+6)%7+1;
const amount = cents => `${cents<0?'-':''}${Math.trunc(Math.abs(cents)/100)}.${String(Math.abs(cents)%100).padStart(2,'0')}`;
const token = process.env.QA_TOKEN || ['eyJhbGciOiJub25lIn0',Buffer.from(JSON.stringify({sub:'statistics@example.invalid',userId:1,username:'Conta de análise',exp:4102444800})).toString('base64url'),'fixture'].join('.');
const coverageFrom=add(today,-180);
let next=5000;
let tasks=span(add(today,-190),today).flatMap((date,i)=>weekday(date)<=5?Array.from({length:(i*7)%4},(_,j)=>({id:next++,title:['Revisar proposta','Concluir leitura técnica','Preparar apresentação','Atualizar portfólio'][j],completedAt:date,plannedDate:add(date,j===0?-1:0),dueDate:date,status:'CONCLUDED',projectId:j%2?20:10,projectTitle:j%2?'Estudos':'Site pessoal'})):[]);
tasks.push(...Array.from({length:10},(_,i)=>({id:next++,title:['Revisar formulário de contato','Organizar referências','Preparar proposta de conteúdo'][i%3],completedAt:null,plannedDate:add(today,-i),dueDate:add(today,i<7?-i-1:2),status:i%2?'ON_DOING':'PENDING',projectId:i%3===0?null:i%2?20:10,projectTitle:i%3===0?null:i%2?'Estudos':'Site pessoal'})));
let habits=[['Ler por 20 minutos',[1,2,3,4,5,6,7]],['Caminhar',[1,3,5]],['Revisar a semana',[7]]].map(([name,weekdays],i)=>({id:100+i,name,createdOn:add(today,-90),startDate:add(today,-90),endDate:null,archivedOn:null,version:0,schedules:[{startDate:add(today,-90),endDate:null,weekdays}],pauses:[],executions:new Set(span(add(today,-90),add(today,-1)).filter((d,j)=>weekdays.includes(weekday(d))&&(j+i)%5!==0))}));
const tags=['Alimentação','Casa','Transporte','Estudos','Saúde','Lazer'].map((name,i)=>({id:301+i,name,color:'#781336',isDefault:false}));
let entries=span(add(today,-65),today).flatMap((date,i)=>{
 const rows=[{id:next++,tagId:tags[i%tags.length].id,amount:-(1390+(i*719)%22000)/100,entryDate:date,description:['Mercado','Serviços da casa','Deslocamento','Livro','Consulta','Cinema'][i%6],isRecurring:false}];
 if(weekday(date)===5)rows.push({id:next++,tagId:304,amount:(180000+i*100)/100,entryDate:date,description:'Serviços de desenvolvimento',isRecurring:false});
 return rows;
});
function period(q){const startDate=q.get('startDate')||add(today,-29),endDate=q.get('endDate')||today;const n=span(startDate,endDate).length;return {startDate,endDate,previousStartDate:add(startDate,-n),previousEndDate:add(startDate,-1),today,timezone:'America/Recife',partial:endDate===today};}
const countDays=(start,end,rows,field='completedAt')=>span(start,end).map(date=>({date,completed:rows.filter(r=>r[field]===date).length}));
function activity(p,source=tasks){const days=countDays(p.startDate,p.endDate,source),previousDays=countDays(p.previousStartDate,p.previousEndDate,source);return{period:p,coverageFrom,total:days.reduce((s,d)=>s+d.completed,0),previousTotal:previousDays.reduce((s,d)=>s+d.completed,0),days,previousDays};}
function state(h,d){if(d<h.startDate||(h.endDate&&d>h.endDate)||(h.archivedOn&&d>=h.archivedOn))return'OUTSIDE';if(h.pauses.some(p=>d>=p.startDate&&d<=p.endDate))return'PAUSED';const s=h.schedules.find(s=>d>=s.startDate&&(!s.endDate||d<=s.endDate));if(!s?.weekdays.includes(weekday(d)))return'OFF';return h.executions.has(d)?'DONE':d===today?'PENDING':'MISSED';}
function habitSummary(p,source=habits){const rows=source.map(h=>{const days=span(p.startDate,p.endDate).map(date=>({date,state:state(h,date)})),previous=span(p.previousStartDate,p.previousEndDate).map(date=>({date,state:state(h,date)}));return{...h,executions:undefined,days,completed:days.filter(d=>d.state==='DONE').length,expected:days.filter(d=>['DONE','PENDING','MISSED'].includes(d.state)).length,previousCompleted:previous.filter(d=>d.state==='DONE').length,previousExpected:previous.filter(d=>['DONE','PENDING','MISSED'].includes(d.state)).length};});const daily=(a,b)=>span(a,b).map(date=>({date,completed:source.filter(h=>state(h,date)==='DONE').length}));return{period:p,coverageFrom,habits:rows,days:daily(p.startDate,p.endDate),previousDays:daily(p.previousStartDate,p.previousEndDate),...Object.fromEntries(['completed','expected','previousCompleted','previousExpected'].map(k=>[k,rows.reduce((s,h)=>s+h[k],0)]))};}
const cents=e=>Math.round(e.amount*100);
function money(rows){const income=rows.filter(e=>e.amount>0).reduce((s,e)=>s+cents(e),0),expenses=-rows.filter(e=>e.amount<0).reduce((s,e)=>s+cents(e),0);return{income:amount(income),expenses:amount(expenses),result:amount(income-expenses),entries:rows.length};}
function finance(p,source=entries){const current=source.filter(e=>e.entryDate>=p.startDate&&e.entryDate<=p.endDate),previous=source.filter(e=>e.entryDate>=p.previousStartDate&&e.entryDate<=p.previousEndDate);const categories=tags.map(t=>({...t,tagId:t.id,amount:amount(-current.filter(e=>e.tagId===t.id&&e.amount<0).reduce((s,e)=>s+cents(e),0)),entries:current.filter(e=>e.tagId===t.id&&e.amount<0).length})).filter(t=>t.entries).sort((a,b)=>Number(b.amount)-Number(a.amount));return{period:p,current:money(current),previous:money(previous),days:span(p.startDate,p.endDate).map(date=>({date,...money(current.filter(e=>e.entryDate===date))})),categories,automaticEntries:0};}
function planning(p,source=tasks){const plan=(a,b)=>{const rows=source.filter(t=>t.plannedDate>=a&&t.plannedDate<=b&&t.status!=='CANCELLED');return{planned:rows.length,completed:rows.filter(t=>t.status==='CONCLUDED'&&t.completedAt<=b).length};};const overdue=source.filter(t=>['PENDING','ON_DOING'].includes(t.status)&&t.dueDate<today);const map=new Map();for(const t of overdue){const key=t.projectId??'none';const row=map.get(key)||{projectId:t.projectId,title:t.projectTitle||'Sem projeto',total:0};row.total++;map.set(key,row);}return{period:p,current:plan(p.startDate,p.endDate),previous:plan(p.previousStartDate,p.previousEndDate),overdue:overdue.length,overdueByProject:[...map.values()].sort((a,b)=>b.total-a.total)};}
function page(rows,q){const number=Number(q.get('page')||0),size=Number(q.get('size')||20);return{content:rows.slice(number*size,(number+1)*size),size,number,totalPages:Math.ceil(rows.length/size),totalElements:rows.length,first:number===0,last:(number+1)*size>=rows.length};}
const receipts=new Map();
const initial=structuredClone({tasks,habits,entries});
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),u=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method;
 const send=(value,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};
 if(u==='/__qa/reset'&&!process.env.QA_API_ORIGIN){({tasks,habits,entries}=structuredClone(initial));receipts.clear();return send({reset:true});}
 const qa=new URL(req.headers.referer||'http://localhost').searchParams.get('state');
 if(process.env.QA_API_ORIGIN&&/^\/(statistics|habits|financial|task|project)(\/|$)/.test(u)){
  let body='';for await(const c of req)body+=c;
  const headers={'content-type':'application/json',authorization:req.headers.authorization||''};for(const name of ['idempotency-key','if-match','x-project-version'])if(req.headers[name])headers[name]=req.headers[name];
  try{const r=await fetch(process.env.QA_API_ORIGIN+u+url.search,{method,headers,body:['GET','HEAD'].includes(method)?undefined:body});res.statusCode=r.status;res.setHeader('Content-Type',r.headers.get('content-type')||'application/json');return res.end(Buffer.from(await r.arrayBuffer()));}catch{return send({message:'Isolated API unavailable'},502);}
 }
 if(/^\/user\/\d+$/.test(u))return send({id:1,name:'Conta de análise',email:'statistics@example.invalid'});
 if(u.includes('preferences'))return send({notifications:false,sound:false,theme:new URL(req.headers.referer||'http://localhost').searchParams.get('theme')||'light'});
 if(u.startsWith('/notification'))return send([]);
 if(u.endsWith('/sidebar'))return send([]);
 if(/^\/(statistics|habits|financial)\//.test(u)){
  if(qa==='error'||(qa==='partial-error'&&u.includes('/finance')))return send({message:'Falha sintética de QA'},503);
  let body={};if(!['GET','HEAD'].includes(method)){let raw='';for await(const c of req)raw+=c;body=raw?JSON.parse(raw):{};}
  const p=period(url.searchParams),empty=qa==='empty',ts=empty?[]:tasks,hs=empty?[]:habits,es=empty?[]:entries;
  if(u.endsWith('/streak')){
   const dates=new Set([...ts.filter(t=>t.status==='CONCLUDED'&&t.completedAt<=today).map(t=>t.completedAt),...hs.flatMap(h=>[...h.executions].filter(d=>d<=today&&state(h,d)==='DONE'))]);
   const throughDate=dates.has(today)?today:dates.has(add(today,-1))?add(today,-1):null;let days=0,startDate=null;
   if(throughDate)for(let d=throughDate;dates.has(d);d=add(d,-1)){days++;startDate=d;}
   return send({today,days,startDate,throughDate,lowerBound:!!startDate&&startDate<=coverageFrom,coverageFrom});
  }
  if(u.endsWith('/activity'))return send(activity(p,ts));
  if(u.endsWith('/planning'))return send(planning(p,ts));
  if(u.endsWith('/finance'))return send(finance(p,es));
  if(u.endsWith('/tasks')){let rows=ts;const kind=url.searchParams.get('kind');rows=rows.filter(t=>kind==='overdue'?['PENDING','ON_DOING'].includes(t.status)&&t.dueDate<today:kind==='planned'?t.plannedDate>=p.startDate&&t.plannedDate<=p.endDate:t.status==='CONCLUDED'&&t.completedAt>=p.startDate&&t.completedAt<=p.endDate);if(url.searchParams.get('projectId'))rows=rows.filter(t=>t.projectId===Number(url.searchParams.get('projectId')));if(url.searchParams.get('unassigned')==='true')rows=rows.filter(t=>t.projectId===null);return send(page(rows,url.searchParams));}
  if(u.endsWith('/dashboard')){
   const monthStart=today.slice(0,8)+'01',lastMonthEnd=add(monthStart,-1),lastMonthStart=lastMonthEnd.slice(0,8)+'01';
   const count=(a,b)=>ts.filter(t=>t.status==='CONCLUDED'&&t.completedAt>=a&&t.completedAt<=b).length;
   const current=count(monthStart,today),previous=count(lastMonthStart,lastMonthEnd),change=previous?(current-previous)/previous*100:null;
   const weekStart=add(today,1-weekday(today)),previousWeekStart=add(weekStart,-7),previousWeekEnd=add(weekStart,-1);
   const plannedRate=(a,b)=>{const rows=ts.filter(t=>t.status!=='CANCELLED'&&t.plannedDate>=a&&t.plannedDate<=b);return rows.length?rows.filter(t=>t.status==='CONCLUDED').length/rows.length*100:0;};
   const currentRate=plannedRate(weekStart,today),oldRate=plannedRate(previousWeekStart,previousWeekEnd),plan=planning(p,ts);
   return send({kpi:{kpis:{completedTasks:{value:current,change,description:change===null?'Primeiras conclusões neste mês':change<0?'Ritmo fraco este mês':'Ritmo forte este mês',additionalDescription:'Comparado ao mês anterior'},productivityRate:{value:Math.trunc(currentRate),change:currentRate-oldRate,description:'Mantendo as metas em dia',additionalDescription:'Concluídas / planejadas de '+weekStart+' a '+today},activeProjects:{value:new Set(ts.map(t=>t.projectId).filter(Boolean)).size,change:null,description:'Projetos NÃO arquivados',additionalDescription:'Total de projetos ativos'},overdueTasks:{value:plan.overdue,change:null,description:'Prazos ultrapassados em tarefas abertas',additionalDescription:'Prazo final anterior a hoje'}}},charts:{tasksCompletedByTimeRangeDTOS:activity({...p,startDate:add(today,-365)},ts).days.filter(d=>d.completed)}});
  }
  if(u.endsWith('/entries')&&method==='GET'){let rows=es.filter(e=>e.entryDate>=p.startDate&&e.entryDate<=p.endDate);if(url.searchParams.get('tagId'))rows=rows.filter(e=>e.tagId===Number(url.searchParams.get('tagId')));return send(page(rows.sort((a,b)=>b.entryDate.localeCompare(a.entryDate)),url.searchParams));}
  if(/^\/habits\/user\/\d+$/.test(u)){
   if(method==='GET')return send(habitSummary(p,hs));
   const key=req.headers['idempotency-key'];if(receipts.has(key))return send(receipts.get(key),201);
   const h={...body,id:next++,createdOn:today,archivedOn:null,version:0,schedules:[{startDate:body.startDate,endDate:null,weekdays:body.weekdays}],pauses:[],executions:new Set()};habits.push(h);const result=habitSummary({ ...p,startDate:today,endDate:today },[h]).habits[0];receipts.set(key,result);return send(result,201);
  }
  const hm=u.match(/^\/habits\/user\/\d+\/(\d+)(.*)$/);if(hm){const h=habits.find(h=>h.id===Number(hm[1]));if(!h)return send({},404);if(h.version!==body.version)return send({message:'O hábito mudou. Recarregue.'},409);if(hm[2].startsWith('/executions/')){const d=hm[2].split('/').pop();if(body.completed)h.executions.add(d);else h.executions.delete(d);}else if(hm[2]==='/archive')h.archivedOn=add(today,1);else if(hm[2]==='/pauses')h.pauses.push({startDate:body.startDate,endDate:body.endDate});else{h.name=body.name;h.schedules[h.schedules.length-1].endDate=today;h.schedules.push({startDate:add(today,1),endDate:null,weekdays:body.weekdays});}h.version++;return send(habitSummary({...p,startDate:today,endDate:today},[h]).habits[0]);}
 }
 if(url.pathname.startsWith('/api/'))return send({message:'Unknown synthetic route'},404);
 let file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(root,'index.html');const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'})[ext]||'application/octet-stream');let content=fs.readFileSync(file);
 if(ext==='.html')content=content.toString().replace('<head>',`<head><script>localStorage.setItem('authToken',${JSON.stringify(token)});localStorage.setItem('oriens-theme',${JSON.stringify(url.searchParams.get('theme')||'light')});{const NativeDate=Date;const instant=${JSON.stringify(instant)};window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[instant]));}static now(){return new NativeDate(instant).getTime();}};}</script>`);
 res.end(content);
}).listen(port,'127.0.0.1',()=>console.log(`Statistics synthetic production QA: http://127.0.0.1:${port}/stats`));
