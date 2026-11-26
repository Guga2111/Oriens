// Runs after the P5 round trip, against the same disposable HTTP/JWT/JPA database.
import { chromium } from '../../../../apps/client/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const [base,projectId,taskId]=process.argv.slice(2);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
try {
 const page=await browser.newPage({viewport:{width:768,height:900},timezoneId:'Pacific/Auckland',reducedMotion:'reduce'});
 await page.clock.setFixedTime(new Date('2026-11-13T12:00:00Z'));
 await page.goto(`${base}/tasks/project/${projectId}`);
 await page.getByRole('button',{name:'Ações do projeto',exact:true}).click();
 const archive=page.waitForResponse(r=>r.request().method()==='PATCH'&&r.url().endsWith(`/project/${projectId}/archive`));
 await page.getByRole('menuitem',{name:'Arquivar',exact:true}).click();assert.equal((await archive).status(),200);
 await page.getByText('Projeto arquivado. As tarefas continuam disponíveis na agenda.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Alternar menu de navegação'}).click();await page.getByRole('link',{name:'Hoje',exact:true}).click();
 const row=page.locator(`#task-row-${taskId}`);await row.getByText(/Projeto arquivado/).waitFor();
 const complete=page.waitForResponse(r=>r.request().method()==='PATCH'&&r.url().endsWith(`/task/${taskId}`));
 await row.getByRole('checkbox').click();const saved=(await (await complete).json()).task;
 assert.equal(saved.status,'CONCLUDED');assert.equal(saved.project.archived,true);assert.equal(saved.dueDate,'2026-11-20');
 await page.goto(`${base}/tasks/project/${projectId}`);
 await page.getByRole('button',{name:'Ações do projeto',exact:true}).click();await page.getByRole('menuitem',{name:'Excluir projeto',exact:true}).click();
 await page.getByText(/tarefas serão preservadas como avulsas/).waitFor();
 await page.getByRole('checkbox',{name:'Entendi as consequências para este projeto.',exact:true}).check();
 const deletion=page.waitForResponse(r=>r.request().method()==='DELETE'&&r.url().endsWith(`/project/${projectId}`));
 await page.getByRole('button',{name:'Excluir projeto',exact:true}).click();assert.equal((await deletion).status(),204);
 await page.getByRole('heading',{name:'Projetos',exact:true}).waitFor();
 await page.getByRole('button',{name:'Alternar menu de navegação'}).click();await page.getByRole('link',{name:'Hoje',exact:true}).click();
 await row.waitFor();
 assert.equal(await row.getByRole('link',{name:'Site pessoal',exact:true}).count(),0);
 await row.getByText('Integração P5',{exact:true}).waitFor();
 assert.ok(await page.locator('body').evaluate(el=>el.scrollWidth<=innerWidth));
 console.log('PASS P6 live: archive → Today remains editable → completion → project deletion preview → same task ID as standalone in Today.');
}finally{await browser.close();}
