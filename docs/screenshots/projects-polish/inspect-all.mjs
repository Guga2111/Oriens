import { spawn } from 'node:child_process';
import fs from 'node:fs';
const base = process.argv[2] || 'http://127.0.0.1:4198';
const root = new URL('./final/', import.meta.url).pathname;
const routes = [['projects','/projects'], ['create','/projects?qa=create'], ['simple','/tasks/project/20'], ['board','/tasks/project/10'], ['objectives','/tasks/project/10?tab=objectives'], ['editor','/tasks/project/10?qa=editor'], ['settings','/tasks/project/10?qa=settings'], ['day','/tasks'], ['week','/tasks?view=week']];
const jobs = routes.flatMap(([name, route]) => (['editor','board','day','settings'].includes(name) ? ['light','dark'] : ['light']).map(theme => ({ name, theme, route })));
const results = [];
async function worker() {
  while (jobs.length) {
    const job = jobs.shift(); const out = root + job.name + '-' + job.theme; fs.mkdirSync(out, { recursive: true });
    const modal = ['editor','create','settings'].includes(job.name);
    const args = ['/Users/luisgosampaio/.agents/skills/design-taste-frontend/scripts/inspect.mjs', '--app', base + job.route + (job.route.includes('?') ? '&' : '?') + 'theme=' + job.theme, '--out', out, '--allow', modal ? 'palette-cream,covered-text,heavy-shadow' : 'palette-cream'];
    const result = await new Promise((resolve, reject) => {
      let log = ''; const child = spawn(process.execPath, args);
      child.on('error', reject); child.stdout.on('data', b => log += b); child.stderr.on('data', b => log += b);
      child.on('close', code => resolve({ code, log }));
    });
    fs.writeFileSync(out + '/inspection.log', result.log);
    results.push({ ...job, code: result.code, summary: result.log.match(/RESULT:.*/)?.[0] });
    console.log(`${job.name}/${job.theme}: ${results.at(-1).summary}`);
  }
}
await Promise.all([worker(), worker(), worker()]);
fs.writeFileSync(root + 'results.json', JSON.stringify(results, null, 2));
if (results.some(result => result.code !== 0)) process.exitCode = 1;
