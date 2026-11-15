import { spawn } from 'node:child_process';
import fs from 'node:fs';
const base = process.argv[2] || 'http://127.0.0.1:4201';
const root = new URL('./inspect/', import.meta.url).pathname;
const jobs = ['light','dark'].flatMap(theme => ['labels','label-editor'].map(qa => ({ theme,qa,name:qa==='labels'?'picker':'editor' })));
const results=[];
async function worker() {
  while(jobs.length) {
    const job=jobs.shift(); const out=root+`${job.name}-${job.theme}`;fs.mkdirSync(out,{recursive:true});
    const args=['/Users/luisgosampaio/.agents/skills/design-taste-frontend/scripts/inspect.mjs','--app',`${base}/tasks/project/10?qa=${job.qa}&theme=${job.theme}`,'--out',out,'--allow','palette-cream,covered-text,heavy-shadow'];
    const result=await new Promise((resolve,reject)=>{let log='';const child=spawn(process.execPath,args);child.on('error',reject);child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);child.on('close',code=>resolve({code,log}));});
    fs.writeFileSync(out+'/inspection.log',result.log);results.push({...job,code:result.code,summary:result.log.match(/RESULT:.*/)?.[0]});console.log(`${job.name}/${job.theme}: ${results.at(-1).summary}`);
  }
}
await Promise.all([worker(),worker()]);fs.writeFileSync(root+'results.json',JSON.stringify(results,null,2));if(results.some(row=>row.code!==0))process.exitCode=1;
