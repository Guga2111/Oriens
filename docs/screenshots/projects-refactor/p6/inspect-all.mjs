// Inspect the final production build using the existing isolated P4/P5 fixtures.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const projects=process.argv[2]||'http://127.0.0.1:4194';
const planning=process.argv[3]||'http://127.0.0.1:4196';
const out=new URL('./',import.meta.url).pathname;
const inspector=process.env.TASTE_INSPECTOR||'/Users/luisgosampaio/.agents/skills/design-taste-frontend/scripts/inspect.mjs';
const screens=[['projects',projects,'/projects'],['simple',projects,'/tasks/project/20'],['board',projects,'/tasks/project/10'],['objectives',projects,'/tasks/project/10?tab=objectives'],['create',projects,'/projects?qa=create'],['editor',projects,'/tasks/project/10?qa=editor'],['settings',projects,'/tasks/project/10?qa=settings'],['day',planning,'/tasks'],['week',planning,'/tasks?view=week']];
const jobs=screens.flatMap(([name,base,route])=>['light','dark'].map(theme=>({name,theme,url:base+route+(route.includes('?')?'&':'?')+'theme='+theme})));
const results=[];
async function worker(){
 while(jobs.length){
  const job=jobs.shift();const dir=out+`final/${job.name}-${job.theme}`;fs.mkdirSync(dir,{recursive:true});
  // Brand is fixed by the SPEC. A real modal obscures the inert page behind it
  // and may cast a floating-surface shadow. Contrast is never exempted.
  const modal=['create','editor','settings'].includes(job.name);
  const args=[inspector,'--app',job.url,'--out',dir,'--allow',modal?'palette-cream,covered-text,heavy-shadow':'palette-cream'];
  const result=await new Promise((resolve,reject)=>{let log='';const child=spawn(process.execPath,args);child.on('error',reject);child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);child.on('close',code=>resolve({code,log}));});
  fs.writeFileSync(dir+'/inspection.log',result.log);
  results.push({...job,exitCode:result.code,summary:result.log.match(/RESULT:.*/)?.[0]??result.log.slice(-400)});
  console.log(`${job.name}/${job.theme}: ${results.at(-1).summary}`);
 }
}
await Promise.all([worker(),worker(),worker()]);
fs.writeFileSync(out+'inspection-results.json',JSON.stringify(results,null,2));
if(results.some(r=>r.exitCode!==0))process.exitCode=1;
