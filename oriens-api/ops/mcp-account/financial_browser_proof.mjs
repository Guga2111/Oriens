/** Production UI proof. Synthetic data/session only; optional proxy to disposable PostgreSQL API. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const projectFront=resolve(import.meta.dirname,'../../../oriens-front');
const root=process.env.P3_FRONT_ROOT||projectFront;
const require=createRequire(root+'/package.json');
const { chromium }=require('@playwright/test');
const mode=process.argv.includes('--before')?'before':'after';
const live=Boolean(process.env.P3_API);
const userId=Number(process.env.P3_USER_ID||7),tagId=Number(process.env.P3_TAG_ID||1);
const token=process.env.P3_JWT?.replace(/^Bearer /,'')||'synthetic.'+Buffer.from(JSON.stringify({userId,username:'Conta sintética',sub:'fixture@example.invalid',exp:4102444800,role:'USER'})).toString('base64url')+'.signature';
const now=new Date(),day=now.toISOString().slice(0,10);
const categories=[{id:tagId,name:'Alimentação',color:'#781336',allowNegative:true,isDefault:false}];
let entries=[{id:1,version:0,amount:-12.34,entryDate:day,description:'Café sintético',tagId,isRecurring:false,createdAt:day+'T10:00:00'},
{id:2,version:0,amount:2500,entryDate:day,description:'Receita sintética',tagId,isRecurring:false,createdAt:day+'T09:00:00'}];
const failures=[];
const server=createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://fixture');
  if(url.pathname.startsWith('/api/')) {
   const path=url.pathname.slice(4)+url.search;
   let data;
   if(path.startsWith('/user/'))data={id:userId,name:'Conta sintética',profileImageUrl:null};
   else if(live&&path.startsWith('/financial/')) {
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const upstream=await fetch(process.env.P3_API+path,{method:req.method,headers:{Authorization:req.headers.authorization||'',...(req.headers['content-type']?{'Content-Type':req.headers['content-type']}:{}),...(req.headers['idempotency-key']?{'Idempotency-Key':req.headers['idempotency-key']}:{}),...(req.headers['if-match']?{'If-Match':req.headers['if-match']}: {})},body:chunks.length?Buffer.concat(chunks):undefined});
    res.writeHead(upstream.status,{'Content-Type':'application/json'});return res.end(await upstream.text());
   } else if(path.includes('/tags'))data=categories;
   else if(path.includes('/entries/recurring'))data=entries.filter(e=>e.isRecurring);
   else if(path.includes('/entries'))data={content:entries,totalElements:entries.length,totalPages:1,number:0,size:20,last:true,first:true};
   else if(path.includes('sidebar'))data=[];
   else if(path.includes('summary'))data={total:0,active:0,archived:0,favorites:0};
   else data=[];
   res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify(data));
  }
  const file=url.pathname.startsWith('/assets/')?resolve(root,'dist','.'+url.pathname):resolve(root,'dist/index.html');
  let bytes=await readFile(file);
  if(extname(file)==='.html')bytes=Buffer.from(bytes.toString().replace('<head>','<head><script>localStorage.setItem("authToken",'+JSON.stringify(token)+');localStorage.setItem("oriens-theme","light");</script>'));
  res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'}[extname(file)]||'application/octet-stream')});res.end(bytes);
 }catch(error){res.writeHead(500);res.end('Fixture failure');failures.push(String(error));}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const front='http://127.0.0.1:'+server.address().port;
const build=spawnSync('npm',['run','build'],{cwd:root,env:{...process.env,VITE_API_BASE_URL:front+'/api'},encoding:'utf8'});
if(build.status!==0)throw new Error(build.stderr);
const out=resolve(projectFront,'.taste-skill/p3',mode);await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try {
 for(const width of [1440,768,390]) {
  console.log('P3 browser snapshot',mode,width);
  const page=await browser.newPage({viewport:{width,height:width===1440?900:width===768?1024:844},locale:'pt-BR'});
  page.on('pageerror',error=>failures.push(error.message));
  await page.goto(front+'/financial');await page.getByRole('heading',{name:'Financeiro',exact:true}).waitFor();
  await page.getByText('Café sintético',{exact:true}).filter({visible:true}).first().waitFor();
  await page.screenshot({path:out+'/'+width+'-page.png',fullPage:true});
  const measure=await page.evaluate(()=>{const el=document.querySelector('#recharts_measurement_span');return el?{id:el.id,top:el.getBoundingClientRect().top,ariaHidden:el.getAttribute('aria-hidden')}:null;});
  if(measure)await writeFile(out+'/'+width+'-measurement.json',JSON.stringify(measure));
  await page.getByRole('button',{name:'Nova entrada',exact:true}).click();
  await page.getByRole('dialog').waitFor();await page.waitForTimeout(350);
  await page.screenshot({path:out+'/'+width+'-create.png'});
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  await page.getByRole('button',{name:'Editar entrada: Café sintético',exact:true}).click();
  await page.getByRole('dialog').waitFor();await page.waitForTimeout(350);await page.screenshot({path:out+'/'+width+'-edit.png'});
  await page.close();
 }
 if(live && mode==='after') {
  console.log('P3 browser: committed retries, conflict, recurrence and keyboard');
  const page=await browser.newPage({viewport:{width:390,height:844},locale:'pt-BR'});
  await page.goto(front+'/financial');
  await page.getByRole('heading',{name:'Financeiro',exact:true}).waitFor();
  const posts=[];let losePost=true;
  await page.route('**/api/financial/**/entries',async route=>{
   if(route.request().method()!=='POST')return route.continue();
   posts.push({key:route.request().headers()['idempotency-key'],body:route.request().postData()});
   const response=await route.fetch();assert.equal(response.status(),201);
   if(losePost){losePost=false;await route.abort('connectionfailed');}else await route.fulfill({response});
  });
  await page.getByRole('button',{name:'Nova entrada',exact:true}).click();
  await page.getByLabel('Valor',{exact:true}).fill('-5.67');
  await page.getByRole('combobox').click();await page.getByRole('option',{name:'Alimentação',exact:true}).click();
  await page.getByLabel('Descrição',{exact:true}).fill('Browser idempotente');
  await page.getByRole('button',{name:'Criar Entrada',exact:true}).click();
  await page.getByText(/Confirmação indisponível/).waitFor();
  assert.equal(await page.getByLabel('Valor',{exact:true}).isDisabled(),true);
  await page.screenshot({path:out+'/390-create-uncertain.png'});
  await page.getByRole('button',{name:'Criar Entrada',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(posts.length,2);assert.deepEqual(posts[0],posts[1]);
  const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
  const rows=await (await fetch(process.env.P3_API+'/financial/user/'+userId+'/entries',{headers})).json();
  const target=rows.content.find(e=>e.description==='Café sintético');assert.ok(target);
  await page.getByRole('button',{name:'Editar entrada: Café sintético',exact:true}).click();
  await page.getByLabel('Valor',{exact:true}).fill('-20.10');
  const {id,version,createdAt,updatedAt,parentEntryId,...editable}=target;
  const external=await fetch(process.env.P3_API+'/financial/user/'+userId+'/entries/'+id,{method:'PUT',headers:{...headers,'If-Match':'"'+version+'"','Idempotency-Key':randomUUID()},body:JSON.stringify({...editable,amount:-15})});assert.equal(external.status,200);
  await page.getByRole('button',{name:'Salvar Alterações',exact:true}).click();
  await page.getByRole('button',{name:'Descartar rascunho e recarregar',exact:true}).waitFor();
  assert.equal(await page.getByLabel('Valor',{exact:true}).inputValue(),'-20.10');
  assert.equal(await page.getByRole('button',{name:'Salvar Alterações',exact:true}).isDisabled(),true);
  await page.waitForFunction(()=>document.querySelectorAll('[data-sonner-toast]').length===0);
  await page.screenshot({path:out+'/390-version-conflict.png'});
  await page.getByRole('button',{name:'Descartar rascunho e recarregar',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#amount')?.value==='-15');
  await page.getByLabel('Valor',{exact:true}).fill('-20.10');
  await page.getByRole('button',{name:'Salvar Alterações',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  const deletes=[];let loseDelete=true;
  await page.route('**/api/financial/**/entries/'+id,async route=>{
   if(route.request().method()!=='DELETE')return route.continue();
   deletes.push({key:route.request().headers()['idempotency-key'],version:route.request().headers()['if-match']});
   const response=await route.fetch();assert.equal(response.status(),204);
   if(loseDelete){loseDelete=false;await route.abort('connectionfailed');}else await route.fulfill({response});
  });
  await page.getByRole('button',{name:'Excluir entrada: Café sintético',exact:true}).click();
  await page.getByRole('button',{name:'Excluir',exact:true}).click();await page.getByRole('alertdialog').getByRole('alert').waitFor();
  await page.getByRole('button',{name:'Excluir',exact:true}).click();await page.getByRole('alertdialog').waitFor({state:'hidden'});
  assert.equal(deletes.length,2);assert.deepEqual(deletes[0],deletes[1]);
  await page.getByRole('button',{name:'Gerenciar',exact:true}).click();await page.getByRole('menuitem',{name:'Recorrências',exact:true}).click();
  await page.getByRole('button',{name:/Editar/}).last().click();
  await page.getByLabel('Data final da recorrência',{exact:true}).waitFor();
  await page.getByLabel('Data final da recorrência',{exact:true}).fill(day);
  await page.getByRole('button',{name:'Salvar Alterações',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  // Keyboard-only traversal of the first action and form, with focus trapped in the dialog.
  await page.getByRole('button',{name:'Nova entrada',exact:true}).focus();await page.keyboard.press('Enter');
  await page.getByRole('dialog').waitFor();await page.waitForTimeout(350);for(let i=0;i<8;i++)await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>Boolean(document.activeElement.closest('[role="dialog"]'))),true);
  await page.getByRole('button',{name:'Cancelar',exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor({state:'hidden'});
  const behavior={productionBuild:true,realIsolatedApi:true,createRetryAfterCommit:true,deleteRetryAfterCommit:true,versionConflictKeepsDraft:true,explicitReload:true,recurrenceEndDate:true,keyboard:true};
  await writeFile(out+'/behavior.json',JSON.stringify(behavior,null,2)+'\n');
  await page.close();
 }
 // Run the skill inspector against the same production build and fixture session.
 const inspected=await new Promise(resolvePromise=>{
  void import('node:child_process').then(({spawn})=>{const p=spawn('node',[process.env.HOME+'/.agents/skills/design-taste-frontend/scripts/inspect.mjs',front+'/financial','--app','--allow','edge-text,palette-cream','--out',out+'/inspect'],{cwd:projectFront,env:{...process.env,CHROME_PATH:chromium.executablePath()},stdio:['ignore','pipe','pipe']});let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);p.on('close',code=>resolvePromise({code,output}));});
 });
 await writeFile(out+'/inspector.log',inspected.output);console.log(inspected.output);
 assert.equal(inspected.code,0,'Production UI inspector must pass');
 if(failures.length)throw new Error(failures.join('\n'));
 console.log(JSON.stringify({mode,productionBuild:true,widths:[1440,768,390],liveApi:live,inspectorExit:inspected.code}));
} finally {await browser.close();await new Promise(r=>server.close(r));}
