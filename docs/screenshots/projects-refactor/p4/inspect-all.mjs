import { spawn } from 'node:child_process';
import fs from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:4183';
const out=new URL('./',import.meta.url).pathname;
const inspector='/Users/luisgosampaio/.agents/skills/design-taste-frontend/scripts/inspect.mjs';
const screens=[['projects','/projects'],['simple','/tasks/project/20'],['board','/tasks/project/10'],['objectives','/tasks/project/10?tab=objectives'],['create','/projects?qa=create'],['editor','/tasks/project/10?qa=editor'],['settings','/tasks/project/10?qa=settings']];
const jobs=screens.flatMap(([name,route])=>['light','dark'].map(theme=>({name,theme,url:base+route+(route.includes('?')?'&':'?')+'theme='+theme})));
const results=[];
async function worker(){
 while(jobs.length){
  const job=jobs.shift();const dir=out+`final/${job.name}-${job.theme}`;fs.mkdirSync(dir,{recursive:true});
  const modal=['create','editor','settings'].includes(job.name);
  // These exceptions apply only to real modals: their overlay covers the page title,
  // and their floating surface keeps the existing dialog shadow. No contrast exemptions.
  const args=[inspector,'--app',job.url,'--out',dir,'--allow',modal?'palette-cream,covered-text,heavy-shadow':'palette-cream'];
  const result=await new Promise(resolve=>{let log='';const child=spawn(process.execPath,args);child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);child.on('close',code=>resolve({code,log}));});
  fs.writeFileSync(dir+'/inspection.log',result.log);results.push({...job,exitCode:result.code,summary:result.log.match(/RESULT:.*/)?.[0]??result.log.slice(-400)});console.log(`${job.name}/${job.theme}: ${results.at(-1).summary}`);
 }
}
await Promise.all([worker(),worker(),worker()]);fs.writeFileSync(out+'inspection-results.json',JSON.stringify(results,null,2));
if(results.some(r=>r.exitCode!==0))process.exitCode=1;
