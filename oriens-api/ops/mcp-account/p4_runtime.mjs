/** Harness only: the production bundle, real isolated API, synthetic session bootstrap. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
export const root=resolve(import.meta.dirname,'../../../oriens-front');
const require=createRequire(root+'/package.json');
export const { chromium }=require('@playwright/test');
export const api=process.env.MCP_PROOF_ISSUER,front=process.env.MCP_PROOF_FRONTEND,jwt=process.env.MCP_PROOF_JWT;
assert.equal(new URL(api).hostname,'127.0.0.1');assert.equal(new URL(front).hostname,'127.0.0.1');
export const identity=JSON.parse(Buffer.from(jwt.replace(/^Bearer /,'').split('.')[1],'base64url').toString());
export async function start({build=true}={}) {
 if(build){const result=spawnSync('npm',['run','build'],{cwd:root,env:{...process.env,VITE_API_BASE_URL:api},encoding:'utf8'});assert.equal(result.status,0,result.stderr);}
 const server=createServer(async(req,res)=>{
  try {
   const url=new URL(req.url,front),file=url.pathname.startsWith('/assets/')?resolve(root,'dist','.'+url.pathname):resolve(root,'dist/index.html');
   let bytes=await readFile(file);
   if(extname(file)==='.html'&&!url.searchParams.has('loggedOut')&&!req.headers.cookie?.includes('p4_no_session=1'))bytes=Buffer.from(bytes.toString().replace('<head>','<head><script>localStorage.setItem("authToken",'+JSON.stringify(jwt.replace(/^Bearer /,''))+');localStorage.setItem("oriens-theme","light");</script>'));
   res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'}[extname(file)]||'application/octet-stream'),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end(bytes);
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise((r,reject)=>{server.once('error',reject);server.listen(Number(new URL(front).port),'127.0.0.1',r);});
 const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('MCP_')&&!key.startsWith('ORIENS_')&&key!=='JWT_SECRET'));
 const browser=await chromium.launch({headless:true,env});
 return {browser,close:async()=>{await browser.close();await new Promise(r=>server.close(r));}};
}
export async function prepare(page) {
 // UserController/preferences are outside the isolated MCP test application. All MCP,
 // login, project, task and financial requests still reach the actual application.
 await page.route(api+'/user/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path===`/user/${identity.userId}`)return route.fulfill({json:{id:identity.userId,name:identity.username,profileImageUrl:null,phoneNumber:null}});
  if(path===`/user/${identity.userId}/preferences`)return route.fulfill({json:{theme:'light',sound:false,notifications:false}});
  return route.continue();
 });
}
export async function rest(path,method='GET',body) {
 const response=await fetch(api+path,{method,headers:{Authorization:jwt,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 assert.ok(response.ok,`REST ${method} ${path}: ${response.status}`);return response.json();
}
