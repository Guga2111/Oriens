// Only profile/preferences outside the isolated test application's imports are synthetic.
import { api, identity } from './p4_runtime.mjs';
const { Browser }=await import(process.env.HOME+'/.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs');
const original=Browser.prototype.newPage;
Browser.prototype.newPage=async function(options){
 const page=await original.call(this,options);
 if(process.env.MCP_INSPECT_COOKIES)await page.send('Network.setCookies',{cookies:JSON.parse(process.env.MCP_INSPECT_COOKIES)});
 this.on(page.sessionId,'Fetch.requestPaused',async({requestId,request})=>{
  if(request.method==='OPTIONS')return page.send('Fetch.continueRequest',{requestId});
  const path=new URL(request.url).pathname;let data;
  if(path===`/user/${identity.userId}`)data={id:identity.userId,name:identity.username,phoneNumber:null,profileImageUrl:null};
  else if(path===`/user/${identity.userId}/preferences`)data={theme:'light',sound:false,notifications:false};
  if(data===undefined)return page.send('Fetch.continueRequest',{requestId});
  await page.send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:process.env.MCP_PROOF_FRONTEND},{name:'Access-Control-Allow-Credentials',value:'true'}],body:Buffer.from(JSON.stringify(data)).toString('base64')});
 });
 await page.send('Fetch.enable',{patterns:[{urlPattern:api+'/user/*',requestStage:'Request'}]});return page;
};
await import(process.env.HOME+'/.agents/skills/design-taste-frontend/scripts/inspect.mjs');
