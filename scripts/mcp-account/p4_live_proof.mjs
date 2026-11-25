import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { start,prepare,rest,root,api,front,jwt,identity,chromium } from './p4_runtime.mjs';
const clientMode=process.argv.includes('--client-consent');
const runtime=await start({build:!clientMode});
const out=resolve(root,'.taste-skill/p4/live');await mkdir(out,{recursive:true});
const failures=[];
async function pageFor(width=1440) {
 const page=await runtime.browser.newPage({viewport:{width,height:width===1440?900:width===768?1024:844},locale:'pt-BR',isMobile:width===390,hasTouch:width===390});
 await prepare(page);page.on('pageerror',e=>failures.push(e.message));
 const accountToken=jwt.replace(/^Bearer /,'');page.on('request',r=>{if(r.url().includes(accountToken)||r.url().includes(encodeURIComponent(accountToken)))failures.push('Account credential found in URL');});
 return page;
}
async function snap(page,name) {
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const dialog=await page.getByRole('dialog').count()>0||await page.getByRole('alertdialog').count()>0;
 if(!dialog)await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:out+'/'+name+'.png',fullPage:!dialog});
}
function begin(client='oriens-codex',scopes='mcp:context projects:read tasks:read tasks:create finance:read offline_access') {
 const verifier=randomBytes(48).toString('base64url'),callback=client==='oriens-codex'?'http://127.0.0.1:54321/callback':'http://localhost:8765/callback';
 const query=new URLSearchParams({response_type:'code',client_id:client,redirect_uri:callback,scope:scopes,resource:api+'/mcp',state:'p4-synthetic',code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
 return {url:api+'/oauth2/authorize?'+query,verifier,callback,client};
}
async function inspect(url,name,cookies) {
 const inspected=await new Promise(done=>{
  const p=spawn('node',[resolve(import.meta.dirname,'p4_inspect.mjs'),url,'--app','--allow','edge-text,palette-cream','--out',out+'/'+name],{cwd:resolve(root,'../api'),env:{...process.env,CHROME_PATH:chromium.executablePath(),...(cookies?{MCP_INSPECT_COOKIES:JSON.stringify(cookies)}:{})},stdio:['ignore','pipe','pipe']});let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);p.on('close',code=>done({code,output}));
 });await writeFile(out+'/'+name+'.log',inspected.output);console.log(inspected.output);assert.equal(inspected.code,0);
 const report=JSON.parse(await readFile(out+'/'+name+'/report.json','utf8'));
 assert.ok(!JSON.stringify(report.viewports).includes('Entrar no Oriens'),'Inspector must see the authenticated product, not the login page');
 if(name==='inspect-consent')assert.ok(Number(inspected.output.match(/page\s+[^\n]*?· (\d+) words/)?.[1])>200,'Inspector must see the permission form, not a flow error');
}
async function captureDecision(page,approve=true) {
 let callback;
 await page.route('**/callback**',route=>{callback=route.request().url();return route.fulfill({contentType:'text/html; charset=utf-8',body:'<meta charset="utf-8"><h1>Retorno sintético do cliente</h1>'});});
 const decision=page.waitForResponse(r=>r.url().includes('/authorization-requests/')&&r.url().endsWith('/decision'),{timeout:10000});
 await page.getByRole('button',{name:approve?'Autorizar conexão':'Cancelar',exact:true}).click();
 const response=await decision;
 if(response.status()!==200){await snap(page,'decision-failure');throw new Error('Consent decision '+response.status()+': '+await response.text());}
 try { await page.getByRole('heading',{name:'Retorno sintético do cliente'}).waitFor(); }
 catch(error) { const target=new URL((await response.json()).redirectUrl);console.error('Validated callback shape:',target.origin,target.pathname,'intercepted:',Boolean(callback));await snap(page,'callback-failure');throw error; }
 assert.ok(callback);return callback;
}
try {
 if(clientMode) {
  const page=await pageFor();
  await page.goto(process.env.MCP_PROOF_AUTH_URL);
  await page.getByRole('heading',{name:'Autorizar conexão',exact:true}).waitFor();
  const scopes=[];
  if(process.env.MCP_P2_PROOF==='1') {
   await page.getByRole('checkbox',{name:'Criar tarefas',exact:true}).check();
   await page.getByRole('checkbox',{name:'Incluir tarefas avulsas',exact:true}).check();
  }
  const renewable=page.getByRole('checkbox',{name:'Manter a conexão renovável',exact:true});if(await renewable.isEnabled())await renewable.check();
  await page.getByLabel('Nome da conexão',{exact:true}).fill('CLI sintético');
  const redirectUrl=await captureDecision(page);
  console.log(JSON.stringify({redirectUrl,productionUi:true}));
 } else {
  for(const width of [1440,768,390]) {
   const page=await pageFor(width);await page.goto(front+'/config');
   await page.getByRole('button',{name:'Gerenciar Revisão semanal'}).waitFor();
   await page.getByText('Não conectado',{exact:true}).waitFor();
   await snap(page,width+'-settings');
   await page.getByRole('button',{name:'Conectar via MCP',exact:true}).focus();await page.keyboard.press('Enter');
   await page.getByRole('dialog').waitFor();await page.getByLabel('URL do servidor').waitFor();await page.waitForTimeout(250);await snap(page,width+'-setup-codex');
   if(width===390)assert.deepEqual(await page.getByRole('dialog').evaluate(dialog=>[...dialog.querySelectorAll('button,input,select')].filter(el=>el.getBoundingClientRect().height<43.9).map(el=>({tag:el.tagName,label:el.getAttribute('aria-label')||el.textContent,height:el.getBoundingClientRect().height}))),[],'Phone controls must be at least 44px');
   for(let i=0;i<8;i++)await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>Boolean(document.activeElement.closest('[role="dialog"]'))),true);
   await page.getByLabel('Cliente',{exact:true}).selectOption('claude-code');await page.getByText(/Validado com Claude Code/).waitFor();await snap(page,width+'-setup-claude');
   await page.getByLabel('Cliente',{exact:true}).selectOption('other');await page.getByText(/compatibilidade depende/).waitFor();await snap(page,width+'-setup-other');
   await page.getByRole('button',{name:'Fechar',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
   assert.equal(await page.getByRole('button',{name:'Conectar via MCP',exact:true}).evaluate(el=>el===document.activeElement),true);
   const manage=page.getByRole('button',{name:'Gerenciar Revisão semanal'});if(width===390)await manage.tap();else await manage.click();
   await page.getByLabel('Nome da conexão').waitFor();await page.waitForTimeout(250);await snap(page,width+'-manage');
   await page.getByLabel('Resultado',{exact:true}).scrollIntoViewIfNeeded();await snap(page,width+'-manage-history');
   await page.getByRole('button',{name:'Fechar',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
   const flow=begin();await page.goto(flow.url);await page.getByLabel('Nome da conexão').waitFor();
   for(const checkbox of await page.getByRole('checkbox').all())assert.equal(await checkbox.isChecked(),false);
   await page.getByRole('checkbox',{name:'Consultar projetos',exact:true}).check();
   await page.getByRole('checkbox',{name:'Planejamento P4',exact:true}).check();
   await page.getByRole('checkbox',{name:'Consultar tarefas',exact:true}).check();
   await snap(page,width+'-consent');
   const cancelled=await captureDecision(page,false);assert.equal(new URL(cancelled).searchParams.get('error'),'access_denied');
   await page.close();
  }
  // Expired account session resumes the same opaque flow after the actual /authenticate.
  const page=await pageFor(390),flow=begin();
  await page.context().addCookies([{name:'p4_no_session',value:'1',url:front}]);
  await page.goto(front+'/?loggedOut=1');await page.evaluate(()=>localStorage.removeItem('authToken'));
  await page.goto(flow.url);await page.getByRole('heading',{name:'Entrar no Oriens',exact:true}).waitFor();
  assert.ok(new URL(page.url()).searchParams.get('mcpFlow'));
  await page.getByLabel('E-mail',{exact:true}).fill(process.env.MCP_PROOF_EMAIL);await page.getByLabel('Senha',{exact:true}).fill('synthetic-password');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('heading',{name:'Autorizar conexão',exact:true}).waitFor();
  await page.getByRole('checkbox',{name:'Consultar finanças',exact:true}).check();
  await page.getByLabel('Nome da conexão').fill('Consentimento P4');
  const callback=await captureDecision(page),code=new URL(callback).searchParams.get('code');assert.ok(code);
  const exchange=await fetch(api+'/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:flow.client,redirect_uri:flow.callback,resource:api+'/mcp',code,code_verifier:flow.verifier})});
  assert.equal(exchange.status,200);const tokens=await exchange.json();assert.ok(tokens.access_token);assert.equal(tokens.refresh_token,undefined);
  const rpc=async(name,args={})=>{const response=await fetch(api+'/mcp',{method:'POST',headers:{Authorization:'Bearer '+tokens.access_token,'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:name,params:args})});return {status:response.status,text:await response.text()};};
  assert.equal((await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'P4',version:'1'}})).status,200);
  const allowed=await rpc('tools/call',{name:'oriens_get_context',arguments:{}});assert.equal(allowed.status,200);assert.ok(allowed.text.includes('Consentimento P4'));
  await page.context().clearCookies({name:'p4_no_session'});await page.goto(front+'/config');await page.getByRole('button',{name:'Gerenciar Revisão semanal'}).click();
  const name=page.getByLabel('Nome da conexão');await name.fill('Rascunho P4');
  const id=process.env.MCP_PROOF_CONNECTION,current=await rest('/integrations/mcp/connections/'+id);
  await rest('/integrations/mcp/connections/'+id,'PATCH',{version:current.version,name:'Revisão semanal'});
  await page.getByRole('button',{name:'Salvar permissões',exact:true}).click();await page.getByRole('button',{name:'Descartar rascunho e recarregar',exact:true}).waitFor();
  assert.equal(await name.inputValue(),'Rascunho P4');await snap(page,'390-conflict');
  await page.getByRole('button',{name:'Descartar rascunho e recarregar',exact:true}).click();await page.waitForFunction(()=>document.querySelector('input')?.value==='Revisão semanal');
  await page.getByRole('checkbox',{name:'Criar lançamentos',exact:true}).uncheck();await page.getByRole('button',{name:'Salvar permissões',exact:true}).click();
  await page.getByText('Permissões salvas.',{exact:true}).waitFor();assert.equal((await rest('/integrations/mcp/connections/'+id)).scopes.includes('finance:create'),false);
  await page.getByRole('button',{name:'Próximos eventos',exact:true}).click();await page.getByText(/Página 2/).waitFor();
  await page.getByLabel('Resultado',{exact:true}).selectOption('DENIED');await page.getByText(/Negada/).last().waitFor();await snap(page,'390-history-filter');
  await page.getByRole('button',{name:'Revogar acesso',exact:true}).click();await page.getByRole('alertdialog').waitFor();await snap(page,'390-revoke');
  await page.getByRole('button',{name:'Revogar conexão',exact:true}).click();await page.getByRole('alertdialog').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Fechar',exact:true}).click();
  await page.getByRole('button',{name:'Gerenciar Consentimento P4'}).click();await page.getByRole('button',{name:'Revogar acesso',exact:true}).click();await page.getByRole('button',{name:'Revogar conexão',exact:true}).click();await page.getByRole('alertdialog').waitFor({state:'hidden'});
  assert.equal((await rpc('tools/call',{name:'oriens_get_context',arguments:{}})).status,401);
  // The app's established settings and WhatsApp state survive the new integration.
  await page.getByRole('button',{name:'Fechar',exact:true}).click();await page.getByText('Não conectado',{exact:true}).waitFor();
  await page.close();
  const evidence={productionBuild:true,realIsolatedApi:true,crossOriginCookie:true,defaultDeny:true,projectNamesAndArchived:true,cancel:true,loginResume:true,pkceExchange:true,permissionReduction:true,conflictKeepsDraft:true,historyPagingAndFilter:true,revocationStopsToken:true,whatsappPreserved:true,keyboardAndFocusReturn:true,widths:[1440,768,390]};
  await writeFile(out+'/behavior.json',JSON.stringify(evidence,null,2)+'\n');
  // Inspector uses the same production bundle and test account. User/profile routes
  // are not in this test app, so its init request is fulfilled by a CDP fixture only.
  await inspect(front+'/config','inspect');
  const consentPage=await pageFor();await consentPage.goto(begin().url);await consentPage.getByLabel('Nome da conexão').waitFor();
  // The correlation cookie is path-scoped to /integrations/mcp/...; querying cookies
  // for the API origin root would omit it. Preserve its actual narrow path.
  const cookies=(await consentPage.context().cookies()).map(({name,value,domain,path,secure,httpOnly,sameSite,expires})=>({name,value,domain,path,secure,httpOnly,sameSite,expires}));
  assert.ok(cookies.some(c=>c.name.startsWith('oriens_mcp_browser_')&&c.httpOnly));
  await inspect(consentPage.url(),'inspect-consent',cookies);await consentPage.close();
  console.log('PASS production P4 settings, consent, login resume, version conflict, history, revocation and three viewports.');
 }
 assert.deepEqual(failures,[]);
} catch(error) {
 for(const context of runtime.browser.contexts())for(const page of context.pages()) {
  await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});
  console.error('P4 UI alerts:',await page.getByRole('alert').allTextContents().catch(()=>[]));
 }
 throw error;
} finally {await runtime.close();}
