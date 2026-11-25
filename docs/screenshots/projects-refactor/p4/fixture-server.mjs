// Only synthetic, in-memory QA data. No connection to the product API or database.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.argv[2] || 'apps/client/dist');
const port = Number(process.argv[3] || 4177);
const token = ['eyJhbGciOiJub25lIn0', Buffer.from(JSON.stringify({ sub:'fixture@example.invalid', userId:1, username:'Demonstração', exp:4102444800 })).toString('base64url'), 'fixture'].join('.');
const date = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Recife',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const objectives = [
  {id:81,projectId:10,title:'Receber contatos pelo site',dueDate:'2026-11-20',status:'PENDING',position:0,version:0},
  {id:82,projectId:10,title:'Reunir os trabalhos de pesquisa e desenvolvimento em um portfólio acessível',dueDate:null,status:'PENDING',position:1,version:0},
];
let projects = [
  {id:10,title:'Site pessoal',mode:'DEVELOPMENT',defaultPendingColumnId:11,defaultCompletedColumnId:13,objectives},
  {id:20,title:'Aprender fotografia',mode:'SIMPLE',objectives:[{id:91,projectId:20,title:'Preparar um ensaio sobre o bairro',dueDate:'2026-11-25',status:'PENDING',position:0,version:0},{id:92,projectId:20,title:'Escolher um tema',dueDate:null,status:'CONCLUDED',position:1,version:0}]},
  {id:30,title:'Ideias para escrever',mode:'DEVELOPMENT',defaultPendingColumnId:31,defaultCompletedColumnId:33,objectives:[]},
].map(p=>({...p,userId:1,description:null,color:null,imageUrl:null,version:0,favorite:false,archived:false,lastAccessed:null}));
let columns = ['A fazer','Fazendo','Concluídas','Backlog','Em teste','Bloqueadas','Canceladas'].map((name,i)=>({id:11+i,projectId:10,name,kind:['PENDING','ON_DOING','CONCLUDED','PENDING','ON_DOING','PENDING','CANCELLED'][i],position:i,version:0}));
columns.push(...['A fazer','Fazendo','Concluídas'].map((name,i)=>({id:31+i,projectId:30,name,kind:['PENDING','ON_DOING','CONCLUDED'][i],position:i,version:0})));
let tasks = [
  {id:1,title:'Montar formulário de contato',columnId:12,objectiveId:81,plannedDate:date,startTime:'09:30:00',dueDate:'2026-11-18',priority:'HIGH',status:'ON_DOING'},
  {id:2,title:'Revisar navegação do portfólio com teclado e leitor de tela',columnId:11,objectiveId:82,plannedDate:date,startTime:null,dueDate:'2026-11-20',priority:'MEDIUM',status:'PENDING'},
  {id:3,title:'Publicar primeira versão',columnId:11,objectiveId:null,plannedDate:null,startTime:null,dueDate:'2026-11-23',priority:'HIGH',status:'PENDING'},
  {id:4,title:'Comparar alternativas de hospedagem',columnId:17,objectiveId:null,plannedDate:null,startTime:null,dueDate:null,priority:'LOW',status:'CANCELLED'},
  {id:5,title:'Validar mensagem de confirmação',columnId:15,objectiveId:81,plannedDate:'2026-11-01',startTime:null,dueDate:'2026-11-10',priority:'HIGH',status:'ON_DOING'},
  {id:6,title:'Separar referências visuais',columnId:13,objectiveId:null,plannedDate:date,startTime:null,dueDate:null,priority:'LOW',status:'CONCLUDED'},
].map((t,i)=>({...t,userId:1,description:null,version:0,projectId:10,position:i,completedAt:t.status==='CONCLUDED'?date:null,createdAt:'2026-11-01T12:00:00Z',location:null}));
const counts = rows => ({totalTasks:rows.length,nonCancelledTasks:rows.filter(t=>t.status!=='CANCELLED').length,completedTasks:rows.filter(t=>t.status==='CONCLUDED').length,cancelledTasks:rows.filter(t=>t.status==='CANCELLED').length});
function taskView(t) { const p=projects.find(p=>p.id===t.projectId); const o=p?.objectives.find(o=>o.id===t.objectiveId); const c=columns.find(c=>c.id===t.columnId); return {...t,project:p?{id:p.id,title:p.title,archived:p.archived,version:p.version}:null,objective:o?{id:o.id,title:o.title}:null,column:c?{id:c.id,name:c.name,kind:c.kind}:null}; }
function projectView(p) {
  const ts=tasks.filter(t=>t.projectId===p.id);const c=counts(ts);const os=p.objectives;
  const active=t=>['PENDING','ON_DOING'].includes(t.status);
  return {...p,...(root.includes('before')?{progress:os.length?Math.trunc(os.filter(o=>o.status==='CONCLUDED').length/os.length*100):0,totalObjectives:os.length}:{}),objectives:os.map(o=>({...o,nonCancelledTasks:ts.filter(t=>t.objectiveId===o.id&&t.status!=='CANCELLED').length,completedTasks:ts.filter(t=>t.objectiveId===o.id&&t.status==='CONCLUDED').length,cancelledTasks:ts.filter(t=>t.objectiveId===o.id&&t.status==='CANCELLED').length})),summary:{...c,totalObjectives:os.length,completedObjectives:os.filter(o=>o.status==='CONCLUDED').length,plannedTodayCount:ts.filter(t=>active(t)&&t.plannedDate===date).length,previousPlansCount:ts.filter(t=>active(t)&&t.plannedDate&&t.plannedDate<date).length,overdueTaskCount:ts.filter(t=>active(t)&&t.dueDate&&t.dueDate<date).length,dueTodayTaskCount:ts.filter(t=>active(t)&&t.dueDate===date).length,overdueObjectiveCount:os.filter(o=>o.status==='PENDING'&&o.dueDate&&o.dueDate<date).length,nextPlannedTask:ts.filter(t=>active(t)&&t.plannedDate>=date).map(taskView)[0]??null,nextObjective:os.filter(o=>o.status==='PENDING'&&o.dueDate).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0]??null}};
}
const page=rows=>({content:rows,number:0,totalPages:1,totalElements:rows.length,last:true});
let nextId=100;const receipts=new Map();
const initial = structuredClone({projects,columns,tasks});
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');const u=url.pathname.replace(/^\/api(?=\/)/,'');const method=req.method;
  const send=(value,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};
  const fail=()=>send({code:'VERSION_CONFLICT',message:'Dados desatualizados.',fieldErrors:[]},409);
  let body={};if(!['GET','HEAD'].includes(method)){let raw='';for await(const chunk of req)raw+=chunk;if(raw){try{body=JSON.parse(raw);}catch{return send({message:'Unsupported QA request'},400);}}}
  if(u==='/__qa/reset'){({projects,columns,tasks}=structuredClone(initial));nextId=100;receipts.clear();return send({reset:true});}
  if(u==='/task-labels/user/1'&&method==='GET')return send([]);
  if(u==='/user/1')return send({id:1,name:'Demonstração',email:'fixture@example.invalid'});
  if(u.includes('preferences'))return send({notifications:false,sound:false,theme:new URL(req.headers.referer||'http://localhost').searchParams.get('theme')||'light'});
  if(u.startsWith('/notification'))return send([]);
  if(u==='/project/user/1/summary')return send({totalProjects:projects.length,activeProjects:projects.filter(p=>!p.archived).length,favoriteProjects:projects.filter(p=>p.favorite&&!p.archived).length,archivedProjects:projects.filter(p=>p.archived).length});
  if(u.startsWith('/project/user/1')&&method==='GET')return send(u.endsWith('sidebar')?projects:page(projects.filter(p=>(url.searchParams.get('includeArchived')==='true'||!p.archived)&&(!url.searchParams.get('search')||p.title.toLowerCase().includes(url.searchParams.get('search').toLowerCase()))).map(projectView)));
  if(u.startsWith('/task/user/1')&&method==='GET'){
    if(u.endsWith('planning-count'))return send({date:url.searchParams.get('date'),activeCount:tasks.filter(t=>t.plannedDate===url.searchParams.get('date')&&!['CANCELLED','CONCLUDED'].includes(t.status)&&t.id!==Number(url.searchParams.get('excludeTaskId'))).length,completedCount:0});
    return send(page(tasks.map(taskView)));
  }
  if(method==='POST'&&['/task/user/1','/project/user/1'].includes(u)){
    const key=req.headers['idempotency-key'];if(!key)return send({message:'Missing idempotency key'},428);if(receipts.has(key))return send(receipts.get(key));
    if(u.startsWith('/task/')){
      const t={id:nextId++,userId:1,version:0,status:'PENDING',projectId:null,objectiveId:null,columnId:null,position:tasks.length,createdAt:new Date().toISOString(),completedAt:null,...body};
      if(t.columnId)t.status=columns.find(c=>c.id===t.columnId).kind;tasks.push(t);const result={task:taskView(t),affectedProjectIds:t.projectId?[t.projectId]:[],previousPlannedDate:null,plannedDate:t.plannedDate};receipts.set(key,result);return send(result,201);
    }
    const p={...projects[0],...body,id:nextId++,version:0,objectives:[],defaultPendingColumnId:null,defaultCompletedColumnId:null};
    if(p.mode==='DEVELOPMENT'){const cs=['A fazer','Fazendo','Concluídas'].map((name,i)=>({id:nextId++,projectId:p.id,name,kind:['PENDING','ON_DOING','CONCLUDED'][i],position:i,version:0}));columns.push(...cs);p.defaultPendingColumnId=cs[0].id;p.defaultCompletedColumnId=cs[2].id;}
    projects.push(p);const result=projectView(p);receipts.set(key,result);return send(result,201);
  }
  const tm=u.match(/^\/task\/(\d+)$/);if(tm){const t=tasks.find(t=>t.id===Number(tm[1]));if(!t)return send({},404);if(method==='GET')return send(taskView(t));if(method==='PATCH'){if(t.version!==body.version)return fail();const previousPlannedDate=t.plannedDate;Object.assign(t,body,{version:t.version+1});if(body.columnId)t.status=columns.find(c=>c.id===body.columnId).kind;return send({task:taskView(t),affectedProjectIds:[t.projectId],previousPlannedDate,plannedDate:t.plannedDate});}}
  const pm=u.match(/^\/project\/(\d+)(.*)$/);if(pm){const p=projects.find(p=>p.id===Number(pm[1]));if(!p)return send({},404);const tail=pm[2];
    if(method==='GET'){
      if(tail==='/deletion-preview')return send({projectVersion:p.version,objectiveCount:p.objectives.length,columnCount:columns.filter(c=>c.projectId===p.id).length,taskCount:tasks.filter(t=>t.projectId===p.id).length});
      if(tail==='/board'){
        const all=tasks.filter(t=>t.projectId===p.id);let visible=all;const q=url.searchParams;
        if(q.get('objectiveId'))visible=visible.filter(t=>t.objectiveId===Number(q.get('objectiveId')));if(q.get('planning')==='today')visible=visible.filter(t=>t.plannedDate===date);if(q.get('planning')==='unscheduled')visible=visible.filter(t=>!t.plannedDate);if(q.get('overdue')==='true')visible=visible.filter(t=>['PENDING','ON_DOING'].includes(t.status)&&t.dueDate&&t.dueDate<date);if(q.get('open')==='true')visible=visible.filter(t=>['PENDING','ON_DOING'].includes(t.status));
        return send({projectId:p.id,projectVersion:p.version,filtered:visible.length!==all.length,columns:columns.filter(c=>c.projectId===p.id).sort((a,b)=>a.position-b.position).map(c=>({...c,totalCount:all.filter(t=>t.columnId===c.id).length,visibleCount:visible.filter(t=>t.columnId===c.id).length})),tasks:visible.map(taskView),total:counts(all),visible:counts(visible)});
      }return send(projectView(p));
    }
    if(tail===''&&method==='DELETE'){if(req.headers['if-match']!==`"${p.version}"`)return fail();tasks=tasks.map(t=>t.projectId===p.id?{...t,projectId:null,objectiveId:null,columnId:null,position:null}:t);projects=projects.filter(x=>x!==p);return send(null);}
    const om=tail.match(/^\/objectives\/(\d+)$/);if(om&&method==='PATCH'){const o=p.objectives.find(o=>o.id===Number(om[1]));if(o.version!==body.version)return fail();Object.assign(o,body,{version:o.version+1});p.version++;return send({objective:o,projectVersion:p.version});}
    if(tail==='/objectives'&&method==='POST'){const o={...body,id:nextId++,projectId:p.id,status:'PENDING',position:p.objectives.length,version:0};p.objectives.push(o);p.version++;return send({objective:o,projectVersion:p.version});}
    if(method==='PATCH'){if(body.version!==p.version)return fail();Object.assign(p,body,{version:p.version+1});if(tail==='/favorite')p.favorite=body.favorite;if(tail==='/archive')p.archived=body.archived;return send(projectView(p));}
  }
  let file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(root,'index.html');const ext=path.extname(file);
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'})[ext]||'application/octet-stream');let content=fs.readFileSync(file);
  if(ext==='.html')content=content.toString().replace('<head>',`<head><script>localStorage.setItem('authToken',${JSON.stringify(token)});localStorage.setItem('oriens-theme',${JSON.stringify(url.searchParams.get('theme')||'light')});
    document.addEventListener('DOMContentLoaded',()=>{
      const qa=new URL(location.href).searchParams.get('qa');if(!qa)return;
      const clickText=(text)=>{const el=[...document.querySelectorAll('button,[role=menuitem]')].find(el=>el.textContent.trim()===text);if(el){el.click();return true;}return false;};
      let opened=false;const timer=setInterval(()=>{
        if(qa==='create'&&clickText('Novo projeto'))clearInterval(timer);
        if(qa==='editor'&&clickText('Nova tarefa'))clearInterval(timer);
        if(qa==='settings'){
          if(!opened){const el=document.querySelector('button[aria-label="Ações do projeto"]');if(el){el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'mouse'}));opened=true;}}
          else if(clickText('Configurar quadro'))clearInterval(timer);
        }
      },100);setTimeout(()=>clearInterval(timer),10000);
    });</script>`);res.end(content);
}).listen(port,'127.0.0.1',()=>console.log(`Synthetic QA build: http://127.0.0.1:${port}/projects`));
