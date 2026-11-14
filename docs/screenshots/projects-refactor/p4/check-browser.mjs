import { chromium } from '../../../../oriens-front/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:4177';
const out=new URL('./',import.meta.url).pathname;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
const results=[];await fetch(base+'/__qa/reset',{method:'POST'});
try {
 for(const width of [1440,768,390,360,1024]) for(const theme of ['light','dark']) {
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce',timezoneId:'Pacific/Auckland'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const capture=async name=>{assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=innerWidth),true,`${name} overflow at ${width}`);await page.screenshot({path:out+`${name}-${theme}-${width}.png`,fullPage:!['create','editor','settings','editor-bottom','settings-bottom'].includes(name)});};
  await page.goto(base+`/projects?theme=${theme}`);await page.getByRole('link',{name:'Abrir quadro',exact:true}).first().waitFor();await page.waitForFunction(t=>document.documentElement.classList.contains(t),theme);await capture('projects');
  await page.getByRole('button',{name:'Novo projeto',exact:true}).click();await page.getByRole('radio',{name:/Simples/}).waitFor();await capture('create');
  await page.keyboard.press('Escape');if(width<640){await page.goto(base+`/projects?theme=${theme}`);}
  await page.goto(base+`/tasks/project/20?theme=${theme}`);await page.getByRole('heading',{name:'Objetivos',exact:true}).waitFor();await capture('simple');
  await page.goto(base+`/tasks/project/10?theme=${theme}`);await page.getByRole('button',{name:'Publicar primeira versão',exact:true}).waitFor();await capture('board');
  await page.getByRole('tab',{name:'Objetivos',exact:true}).click();await page.getByRole('heading',{name:'Objetivos',exact:true}).waitFor();await capture('objectives');
  await page.getByRole('button',{name:'Adicionar tarefa',exact:true}).first().click();await page.getByRole('dialog').waitFor();await page.getByText('Estado ao salvar: A fazer',{exact:true}).waitFor();await capture('editor');
  if(width<640){assert.ok((await page.getByRole('button',{name:'Salvar tarefa',exact:true}).boundingBox()).height>=44);assert.ok((await page.getByLabel('Dia planejado',{exact:true}).boundingBox()).height>=44);}
  await page.getByLabel('Localização (opcional)',{exact:true}).scrollIntoViewIfNeeded();await capture('editor-bottom');
  await page.getByLabel('Título',{exact:true}).fill('Rascunho para testar descarte');await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  // Drawer can be closed by its overlay; the explicit discard confirmation is also keyboard reachable.
  {await page.getByRole('alertdialog').waitFor();await page.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(await page.getByLabel('Título',{exact:true}).inputValue(),'Rascunho para testar descarte');}
  await page.goto(base+`/tasks/project/10?theme=${theme}`);await page.getByRole('button',{name:'Ações do projeto',exact:true}).click();await page.getByRole('menuitem',{name:'Configurar quadro',exact:true}).click();await page.getByRole('dialog').waitFor();await capture('settings');await page.getByRole('combobox',{name:'Padrão ao concluir',exact:true}).scrollIntoViewIfNeeded();await capture('settings-bottom');
  assert.deepEqual(errors,[]);results.push({width,theme,overflow:false,errors});await page.close();
 }
 // Native HTML drag is desktop-only; touch uses the destination menu.
 const dragPage=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await dragPage.goto(base+'/tasks/project/10');
 const dragRequest=dragPage.waitForRequest(r=>r.method()==='PATCH'&&r.url().endsWith('/task/2'));
 await dragPage.getByRole('button',{name:'Arrastar Revisar navegação do portfólio com teclado e leitor de tela',exact:true}).dragTo(dragPage.getByRole('region',{name:'Fazendo',exact:true}));
 assert.equal((await dragRequest).postDataJSON().columnId,12);await dragPage.close();await fetch(base+'/__qa/reset',{method:'POST'});
 // A complete keyboard movement and filter path, with request observed at the transport boundary.
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await page.goto(base+'/tasks/project/10');await page.getByRole('button',{name:'Publicar primeira versão',exact:true}).waitFor();
 await page.getByRole('button',{name:'Ações da tarefa Publicar primeira versão'}).focus();await page.keyboard.press('Enter');
 const request=page.waitForRequest(r=>r.method()==='PATCH'&&r.url().endsWith('/task/3'));
 await page.getByRole('menuitem',{name:'Fazendo · Em andamento',exact:true}).focus();await page.keyboard.press('Enter');
 const payload=(await request).postDataJSON();assert.equal(payload.columnId,12);assert.equal(payload.beforeTaskId,null);
 await page.getByRole('status').filter({hasText:'Tarefa movida para Fazendo'}).waitFor();
 await page.getByRole('button',{name:/^Filtros/}).click();await page.getByRole('combobox',{name:'Filtrar planejamento'}).click();await page.getByRole('option',{name:'Sem planejamento',exact:true}).click();
 await page.getByRole('button',{name:'Aplicar filtros'}).click();await page.getByText(/Movimentos entre colunas vão para o final/).waitFor();await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();
 assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=innerWidth),true);
 await page.getByRole('button',{name:'Nova tarefa',exact:true}).click();await page.getByText('Estado ao salvar: A fazer',{exact:true}).waitFor();
 await page.getByLabel('Título',{exact:true}).fill('Verificar fluxo de contatos');
 await page.getByLabel('Dia planejado',{exact:true}).fill('2026-11-18');await page.getByLabel('Prazo final (opcional)',{exact:true}).fill('2026-11-17');
 await page.getByText(/O dia planejado é posterior ao prazo final/).waitFor();
 const creation=page.waitForRequest(r=>r.method()==='POST'&&r.url().endsWith('/task/user/1'));
 await page.getByRole('button',{name:'Salvar tarefa',exact:true}).focus();await page.keyboard.press('Enter');
 const creationRequest=await creation;assert.equal(creationRequest.postDataJSON().plannedDate,'2026-11-18');assert.equal(creationRequest.postDataJSON().dueDate,'2026-11-17');assert.ok(creationRequest.headers()['idempotency-key']);
 await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.getByRole('combobox',{name:'Coluna do quadro'}).click();await page.getByRole('option',{name:/^A fazer/}).click();await page.getByRole('button',{name:'Verificar fluxo de contatos',exact:true}).waitFor();
 await page.close();await fetch(base+'/__qa/reset',{method:'POST'});fs.writeFileSync(out+'browser-results.json',JSON.stringify({results,keyboardMove:true,filters:true,nativeDesktopDrag:true,creation:true},null,2));
 console.log('PASS: production screens in light/dark at 1440/768/390/360/1024, no JS errors or page overflow; keyboard movement, filtered order and draft preservation.');
}finally{await browser.close();}
