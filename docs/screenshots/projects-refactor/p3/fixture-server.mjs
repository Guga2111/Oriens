// Synthetic data only. Serves a production build plus local API doubles for visual QA.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.argv[2] || 'oriens-front/dist');
const port = Number(process.argv[3] || 4173);
const token = ['eyJhbGciOiJub25lIn0', Buffer.from(JSON.stringify({ sub:'fixture@example.invalid', userId:1, username:'Demonstração', exp:4102444800 })).toString('base64url'), 'fixture'].join('.');
const tasks = [
  {id:1,title:'Montar formulário de contato',plannedDate:'2026-11-14',startTime:'09:30:00',dueDate:'2026-11-18',priority:'HIGH',status:'ON_DOING'},
  {id:2,title:'Revisar navegação do portfólio',plannedDate:'2026-11-15',startTime:null,dueDate:'2026-11-20',priority:'MEDIUM',status:'PENDING'},
  {id:3,title:'Publicar primeira versão',plannedDate:null,startTime:null,dueDate:'2026-11-23',priority:'HIGH',status:'PENDING'},
  {id:4,title:'Comparar alternativas de hospedagem',plannedDate:null,startTime:null,dueDate:null,priority:'LOW',status:'CANCELLED'},
].map(t => ({...t,userId:1,description:null,version:0,projectId:10,objectiveId:null,columnId:1,position:0,completedAt:null,createdAt:'2026-11-01T12:00:00Z',location:null,project:{id:10,title:'Site pessoal',archived:false,version:0},column:null,objective:null}));
const projects = [{id:10,userId:1,title:'Site pessoal',mode:'DEVELOPMENT',version:0,favorite:false,archived:false,objectives:[],progress:0,totalObjectives:0,
  summary:{totalObjectives:0,completedObjectives:0,nonCancelledTasks:3,completedTasks:0,cancelledTasks:1,totalTasks:4}}];
const page = rows => ({content:rows,number:0,totalPages:1,totalElements:rows.length});
http.createServer((req,res) => {
  const url = new URL(req.url,'http://localhost');
  url.pathname = url.pathname.replace(/^\/api(?=\/)/, '');
  const send = value => { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(value)); };
  if (url.pathname === '/user/1') return send({id:1,name:'Demonstração',email:'fixture@example.invalid'});
  if (url.pathname.includes('preferences')) return send({notifications:false,sound:false,theme:url.searchParams.get('theme') || 'light'});
  if (url.pathname.startsWith('/notification')) return send([]);
  if (url.pathname.startsWith('/project/user/')) return send(url.pathname.endsWith('sidebar') ? projects : page(projects));
  if (url.pathname.startsWith('/task/user/')) {
    let rows = (root.includes('before') ? tasks.filter(t => t.status !== 'CANCELLED') : tasks).filter(t => !url.searchParams.get('status') || t.status === url.searchParams.get('status'));
    const search = url.searchParams.get('search'); if (search) rows = rows.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    return send(page(rows));
  }
  let file = path.resolve(root, '.' + url.pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root,'index.html');
  const ext = path.extname(file);
  res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'})[ext] || 'application/octet-stream');
  let content = fs.readFileSync(file);
  if (ext === '.html') content = content.toString().replace('<head>', `<head><script>localStorage.setItem('authToken',${JSON.stringify(token)});localStorage.setItem('oriens-theme','light');</script>`);
  res.end(content);
}).listen(port,'127.0.0.1',() => console.log(`Fixture production build: http://127.0.0.1:${port}/all-data`));
