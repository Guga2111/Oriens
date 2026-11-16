// Synthetic cross-origin OAuth bridge; this is not the P4 product interface.
import { chromium } from '../../../oriens-front/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const api=process.env.MCP_PROOF_ISSUER, front=process.env.MCP_PROOF_FRONTEND, jwt=process.env.MCP_PROOF_JWT;
assert.equal(new URL(api).hostname,'127.0.0.1');assert.equal(new URL(front).hostname,'127.0.0.1');
const fixture=createServer((request,response)=>{response.setHeader('Content-Type','text/html');response.setHeader('Cache-Control','no-store');response.end('<!doctype html><html lang="pt-BR"><title>Prova sintética OAuth</title><main><h1>Prova sintética OAuth</h1><p>Aguardando a verificação da ponte.</p></main></html>');});
await new Promise(resolve=>fixture.listen(Number(new URL(front).port),'127.0.0.1',resolve));
const browser=await chromium.launch({env:Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('MCP_PROOF_')&&key!=='JWT_SECRET')),headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
try {
 const context=await browser.newContext();const page=await context.newPage();const urls=[];page.on('request',r=>urls.push(r.url()));
 const verifier=randomBytes(48).toString('base64url');
 const query=new URLSearchParams({response_type:'code',client_id:'oriens-codex',redirect_uri:'http://127.0.0.1:54321/callback',scope:'mcp:context',resource:api+'/mcp',state:'synthetic-browser-state',code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
 await page.goto(api+'/oauth2/authorize?'+query);
 assert.equal(new URL(page.url()).origin,front);const id=new URL(page.url()).searchParams.get('mcpFlow');assert.ok(id);
 const endpoint=api+'/integrations/mcp/authorization-requests/'+id;
 const summary=await page.evaluate(async({endpoint,jwt})=>{
   const r=await fetch(endpoint,{credentials:'include',headers:{Authorization:jwt}});return {status:r.status,data:await r.json()};
 },{endpoint,jwt});assert.equal(summary.status,200);assert.equal(summary.data.clientId,'oriens-codex');
 const unauthenticated=await page.evaluate(async endpoint=>(await fetch(endpoint,{credentials:'include'})).status,endpoint);assert.equal(unauthenticated,401);
 const cookies=await context.cookies(endpoint);assert.ok(cookies.some(c=>c.name.startsWith('oriens_mcp_browser_')&&c.httpOnly&&c.sameSite==='Lax'));
 const stranger=await browser.newContext();const second=await stranger.newPage();await second.goto(front);
 const missing=await second.evaluate(async({endpoint,jwt})=>(await fetch(endpoint,{credentials:'include',headers:{Authorization:jwt}})).status,{endpoint,jwt});assert.equal(missing,403);await stranger.close();
 const decision=await page.evaluate(async({endpoint,jwt,version})=>{
   const r=await fetch(endpoint+'/decision',{method:'POST',credentials:'include',headers:{Authorization:jwt,'Content-Type':'application/json'},body:JSON.stringify({version,approve:true,name:'Navegador sintético',scopes:['mcp:context'],allowedProjectIds:[],allowStandaloneTasks:false})});return {status:r.status,data:await r.json()};
 },{endpoint,jwt,version:summary.data.version});assert.equal(decision.status,200);
 const code=new URL(decision.data.redirectUrl).searchParams.get('code');assert.ok(code);
 const exchanged=await page.evaluate(async({api,code,verifier})=>{
   const r=await fetch(api+'/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:'oriens-codex',redirect_uri:'http://127.0.0.1:54321/callback',resource:api+'/mcp',code,code_verifier:verifier})});const data=await r.json();return {status:r.status,token:typeof data.access_token==='string',refresh:'refresh_token' in data};
 },{api,code,verifier});assert.equal(exchanged.status,200);assert.equal(exchanged.token,true);assert.equal(exchanged.refresh,false);
 assert.ok(urls.every(url=>!url.includes(jwt)&&!url.includes(encodeURIComponent(jwt))));
 await writeFile('target/mcp-browser-proof.json',JSON.stringify({crossOrigin:true,httpOnlyCorrelation:true,cookieAloneIsNotIdentity:true,jwtAloneCannotClaimExistingFlow:true,consent:true,pkceExchange:true,jwtNeverInUrl:true,productionUi:false},null,2)+'\n');
 console.log('PASS real browser: cross-origin cookies/CORS, JWT header, consent, PKCE and isolated browser denial.');
} finally {await browser.close();await new Promise(resolve=>fixture.close(resolve));}
