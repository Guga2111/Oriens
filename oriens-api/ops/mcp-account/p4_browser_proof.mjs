/** Production settings fixture. All accounts and objects here are synthetic. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const root=resolve(import.meta.dirname,'../../../oriens-front');
const require=createRequire(root+'/package.json');
const { chromium }=require('@playwright/test');
const mode=process.argv.includes('--before')?'before':'after';
const out=resolve(root,'.taste-skill/p4',mode);await mkdir(out,{recursive:true});
const userId=7;
const token='synthetic.'+Buffer.from(JSON.stringify({userId,username:'Conta sintética',sub:'fixture@example.invalid',exp:4102444800,role:'USER'})).toString('base64url')+'.signature';
const failures=[];
const server=createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://fixture');
  if(url.pathname.startsWith('/api/')) {
   const path=url.pathname.slice(4);
   let data=[];
   if(path.startsWith('/user/'))data={id:userId,name:'Conta sintética',profileImageUrl:null,phoneNumber:null};
   else if(path.includes('/preferences'))data={theme:'light',sound:false,notifications:false};
   else if(path.endsWith('/connections'))data={items:[],page:0,pageSize:20,totalElements:0,hasNext:false};
   else if(path.includes('/setup'))data={client:url.searchParams.get('client'),resource:'https://api.oriens.test/mcp',issuer:'https://api.oriens.test',clientId:url.searchParams.get('client')==='codex'?'oriens-codex':'oriens-claude-code',redirectUris:[url.searchParams.get('client')==='codex'?'http://127.0.0.1/callback':'http://localhost:8765/callback'],scopes:['mcp:context','offline_access','projects:read','tasks:read','tasks:create','finance:read'],auditRetentionDays:90};
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
const browser=await chromium.launch({headless:true});
try {
 for(const width of [1440,768,390]) {
  const page=await browser.newPage({viewport:{width,height:width===1440?900:width===768?1024:844},locale:'pt-BR'});
  page.on('pageerror',error=>failures.push(error.message));
  await page.goto(front+'/config');await page.getByRole('heading',{name:'Configurações',exact:true}).waitFor();
  await page.getByText('Não conectado',{exact:true}).waitFor();
  await page.screenshot({path:out+'/'+width+'-settings.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.close();
 }
 const inspected=await new Promise(done=>{
  const p=spawn('node',[process.env.HOME+'/.agents/skills/design-taste-frontend/scripts/inspect.mjs',front+'/config','--app','--allow','edge-text,palette-cream','--out',out+'/inspect'],{cwd:root,env:{...process.env,CHROME_PATH:chromium.executablePath()},stdio:['ignore','pipe','pipe']});
  let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);p.on('close',code=>done({code,output}));
 });
 await writeFile(out+'/inspector.log',inspected.output);console.log(inspected.output);
 if(mode==='after')assert.equal(inspected.code,0,'Production UI inspector must pass');
 assert.deepEqual(failures,[]);console.log(JSON.stringify({mode,productionBuild:true,widths:[1440,768,390],inspectorExit:inspected.code}));
} finally {await browser.close();await new Promise(r=>server.close(r));}
