import { expect, test, type Page } from '@playwright/test';
import type { TaskDescriptionDocument, TaskPatch, WorkTask } from '../../src/types/work';
import { prepareVisualPage } from './fixtures';

const initial: WorkTask = {
  id: 101, userId: 1, title: 'Preparar a revisão do contrato',
  description: 'Conferir o contrato com os dados de teste.\n\nRevisar os cenários de concorrência.',
  projectId: null, objectiveId: null, columnId: null, position: null, plannedDate: null, startTime: null,
  dueDate: null, completedAt: null, createdAt: '2026-11-25T15:00:00Z', priority: 'MEDIUM',
  status: 'PENDING', location: null, version: 1, project: null, objective: null, column: null, labels: [],
};

const paragraph = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const doc = (...content: TaskDescriptionDocument['content'][]) => ({ schemaVersion: 1 as const, content: { type: 'doc', content } });

async function openTask(page: Page, colorScheme: string, initialTask: WorkTask = initial) {
  await prepareVisualPage(page, colorScheme === 'dark' ? 'dark' : 'light', true);
  await page.route('**/visual-api/work/home/recents', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 204 }) : route.fulfill({ json: [] }));
  let task = initialTask;
  let returnStatus = 200;
  const writes: TaskPatch[] = [];
  await page.route('**/visual-api/task/101', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: task });
    const patch = route.request().postDataJSON() as TaskPatch;
    expect(route.request().headers()['if-match']).toBe(`"${patch.version}"`);
    writes.push(patch);
    const status = returnStatus;
    returnStatus = 200;
    if (status !== 200 || patch.version !== task.version) {
      return route.fulfill({ status: status === 200 ? 409 : status, json: { message: 'Salvar indisponível.' } });
    }
    task = { ...task, description: patch.descriptionDoc ? 'Descrição salva' : null,
      descriptionDoc: patch.descriptionDoc, version: task.version + 1 };
    return route.fulfill({ json: { task, affectedProjectIds: [], previousPlannedDate: null, plannedDate: null } });
  });
  await page.goto('/tasks?task=101');
  const panel = page.getByRole('dialog', { name: initial.title });
  await expect(panel).toBeVisible();
  return { panel, writes, failNext: (status: number) => { returnStatus = status; },
    changeRemote: (change: Partial<WorkTask>) => { task = { ...task, ...change, version: task.version + 1 }; } };
}

test('insere blocos por teclado, sai com Esc e salva com versão', async ({ page, colorScheme }, testInfo) => {
  const { panel, writes } = await openTask(page, colorScheme);
  await expect(panel.getByText(/Conferir o contrato/)).toBeVisible();
  await panel.getByRole('button', { name: 'Editar descrição' }).click();
  const editor = panel.getByRole('textbox', { name: 'Descrição', exact: true });
  await editor.press('ControlOrMeta+a');
  await editor.press('Backspace');
  await editor.pressSequentially('/h2');
  await expect(page.getByRole('option', { name: 'Título 2', exact: true })).toBeVisible();
  await editor.press('Enter');
  await editor.pressSequentially('Plano de entrega');
  await expect(editor.getByRole('heading', { name: 'Plano de entrega', level: 2 })).toBeVisible();

  await editor.press('Enter');
  await editor.pressSequentially('[] ');
  await editor.pressSequentially('Revisar contrato');
  const checkbox = editor.getByRole('checkbox');
  await expect(checkbox).toBeVisible();
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await editor.press('Escape');
  await expect(panel).toBeVisible();
  await expect(editor).toHaveCount(0);
  await expect.poll(() => JSON.stringify(writes.at(-1)?.descriptionDoc)).toContain('"checked":true');
  await expect(panel.getByRole('heading', { name: 'Plano de entrega', level: 2 })).toBeVisible();

  await panel.screenshot({ path: testInfo.outputPath('description-preview.png') });
  await panel.getByRole('button', { name: 'Editar descrição' }).click();
  await editor.press('ControlOrMeta+a');
  await editor.press('Backspace');
  await editor.press('Escape');
  await expect.poll(() => writes.at(-1)?.descriptionDoc).toBeNull();
  await expect(panel.getByRole('button', { name: 'Adicionar descrição…' })).toBeVisible();
});

test('mantém o rascunho em falha e exige escolha quando a descrição mudou', async ({ page, colorScheme }) => {
  const { panel, writes, failNext, changeRemote } = await openTask(page, colorScheme);
  failNext(503);
  await panel.getByRole('button', { name: 'Editar descrição' }).click();
  const editor = panel.getByRole('textbox', { name: 'Descrição', exact: true });
  await editor.press('ControlOrMeta+a');
  await editor.pressSequentially('Meu rascunho');
  await expect(panel.getByRole('alert')).toContainText('O rascunho foi mantido.');
  await expect(editor).toContainText('Meu rascunho');

  changeRemote({ description: 'Alteração externa', descriptionDoc: doc(paragraph('Alteração externa')) });
  await panel.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(panel.getByRole('alert')).toContainText('A descrição foi alterada em outro lugar.');
  await panel.getByText('Ver versão salva', { exact: true }).click();
  await expect(panel.getByText('Alteração externa', { exact: true })).toBeVisible();
  await expect(editor).toContainText('Meu rascunho');
  await panel.getByRole('button', { name: 'Manter meu rascunho' }).click();
  await expect.poll(() => writes.at(-1)?.version).toBe(2);
  await expect(panel.getByRole('alert')).toHaveCount(0);
});

test('expande descrição e renderiza Mermaid quando randomUUID está indisponível', async ({ page, colorScheme }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.crypto, 'randomUUID', { value: undefined });
  });
  const document = doc(
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Diretrizes da entrega' }] },
    ...Array.from({ length: 14 }, (_, index) => paragraph(`Verificação ${index + 1} do contrato.`)),
    { type: 'codeBlock', attrs: { language: 'mermaid' }, content: [
      { type: 'text', text: 'flowchart LR\n    draft[Rascunho] --> review[Revisão] --> done[Publicação]' },
    ] },
  );
  const { panel } = await openTask(page, colorScheme, { ...initial, descriptionDoc: document });
  const expand = panel.getByRole('button', { name: 'Mostrar tudo' });
  await expect(expand).toHaveAttribute('aria-expanded', 'false');
  await expand.click();
  const diagram = panel.getByRole('img', { name: 'Diagrama Mermaid' });
  await expect(diagram).toBeVisible();
  await expect.poll(() => diagram.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await diagram.scrollIntoViewIfNeeded();
  await panel.screenshot({ path: testInfo.outputPath('description-expanded.png') });
  await panel.getByRole('button', { name: 'Mostrar menos' }).click();
  await expect(expand).toBeVisible();
});

test('adiciona linha e coluna em relação à célula selecionada', async ({ page, colorScheme }) => {
  const cell = (type: 'tableHeader' | 'tableCell', text: string) => ({ type, content: [paragraph(text)] });
  const { panel, writes } = await openTask(page, colorScheme, {
    ...initial, descriptionDoc: doc({ type: 'table', content: [
      { type: 'tableRow', content: [cell('tableHeader', 'Etapa'), cell('tableHeader', 'Situação')] },
      { type: 'tableRow', content: [cell('tableCell', 'Revisão'), cell('tableCell', 'Pendente')] },
    ] }),
  });
  await panel.getByRole('button', { name: 'Editar descrição' }).click();
  const editor = panel.getByRole('textbox', { name: 'Descrição', exact: true });
  const table = editor.getByRole('table');
  const menu = panel.getByRole('button', { name: 'Tabela', exact: true });

  await table.getByRole('cell', { name: 'Revisão' }).click();
  await menu.click();
  await page.getByRole('menuitem', { name: 'Adicionar linha abaixo' }).click();
  await expect(table.getByRole('row')).toHaveCount(3);

  await table.getByRole('columnheader', { name: 'Etapa' }).click();
  await menu.click();
  await page.getByRole('menuitem', { name: 'Adicionar coluna à direita' }).click();
  await expect(table.getByRole('columnheader')).toHaveCount(3);
  await expect(table.getByRole('columnheader').nth(2)).toHaveText('Situação');
  await expect.poll(() => writes.at(-1)?.descriptionDoc?.content.content?.[0]?.content
    ?.map(row => row.content?.length)).toEqual([3, 3, 3]);

  await table.getByRole('cell').last().click();
  await editor.press('Tab');
  await expect(table.getByRole('row')).toHaveCount(4);
});

test('renderiza diagramas de sequência e de fluxo durante a edição', async ({ page, colorScheme }) => {
  const diagram = (source: string) => ({
    type: 'codeBlock', attrs: { language: 'mermaid' }, content: [{ type: 'text', text: source }],
  });
  const { panel } = await openTask(page, colorScheme, {
    ...initial, descriptionDoc: doc(
      diagram([
        'sequenceDiagram',
        '    Alice->>John: Hello John, how are you?',
        '    loop HealthCheck',
        '        John->>John: Fight against hypochondria',
        '    end',
        '    Note right of John: Rational thoughts!',
        '    John-->>Alice: Great!',
      ].join('\n')),
      diagram('flowchart LR\n    draft[Rascunho] --> review[Revisão] --> done[Publicação]'),
    ),
  });
  await panel.getByRole('button', { name: 'Editar descrição' }).click();
  const editor = panel.getByRole('textbox', { name: 'Descrição', exact: true });
  const previews = editor.getByRole('img', { name: 'Diagrama Mermaid' });
  await expect(previews).toHaveCount(2);
  for (const preview of await previews.all()) {
    await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  }
});

test('aplica formatação pela seleção e move um bloco pela alça', async ({ page, colorScheme }) => {
  const { panel, writes } = await openTask(page, colorScheme, {
    ...initial, descriptionDoc: doc(paragraph('Primeiro'), paragraph('Segundo'), paragraph('Terceiro')),
  });
  await panel.getByRole('button', { name: 'Editar descrição' }).click();
  const editor = panel.getByRole('textbox', { name: 'Descrição', exact: true });
  await editor.getByText('Segundo', { exact: true }).dblclick();
  await page.getByRole('toolbar', { name: 'Formatação da descrição' }).getByRole('button', { name: 'Negrito' }).click();
  await expect(editor.locator('strong')).toHaveText('Segundo');
  await editor.press('ArrowRight');
  await editor.getByText('Segundo', { exact: true }).hover();
  const handle = panel.locator('.description-grip');
  await expect(handle).toBeVisible();
  await handle.dragTo(editor.getByText('Primeiro', { exact: true }), { targetPosition: { x: 5, y: 1 }, timeout: 5000 });
  await expect(editor.locator('p').first()).toHaveText('Segundo');
  await expect.poll(() => writes.at(-1)?.descriptionDoc?.content.content?.[0]?.content?.[0]?.text).toBe('Segundo');
});

test('exige texto alternativo e insere anexo privado com referência estável', async ({ page, colorScheme }) => {
  const attachment = '1a03cace-8b58-4005-be0d-e666093ddf7f';
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJk0AAAAASUVORK5CYII=', 'base64');
  const { panel, writes } = await openTask(page, colorScheme);
  await page.route('**/visual-api/task/101/attachments?kind=image', route =>
    route.fulfill({ status: 201, json: { id: attachment, kind: 'image', contentType: 'image/png' } }));
  await page.route(`**/visual-api/task/101/attachments/${attachment}`, route =>
    route.fulfill({ json: { id: attachment, contentType: 'image/png', expiresAt: '2026-11-25T15:05:00Z',
      url: `/task/attachments/content/101/${attachment}?signature=fixture` } }));
  await page.route('**/visual-api/task/attachments/content/**', route => route.fulfill({ contentType: 'image/png', body: image }));
  await panel.getByRole('button', { name: 'Editar descrição' }).click();
  await panel.getByRole('button', { name: 'Inserir bloco' }).click();
  await page.getByRole('option', { name: 'Imagem', exact: true }).click();
  const form = panel.getByRole('group', { name: 'Inserir imagem' });
  await form.getByLabel('Arquivo de até 2 MiB').setInputFiles({ name: 'contrato.png', mimeType: 'image/png', buffer: image });
  await expect(form.getByRole('button', { name: 'Inserir', exact: true })).toBeDisabled();
  await form.getByLabel('Texto alternativo').fill('Trecho do contrato revisado');
  await form.getByRole('button', { name: 'Inserir', exact: true }).click();
  await expect(panel.getByRole('img', { name: 'Trecho do contrato revisado' })).toBeVisible();
  await expect.poll(() => JSON.stringify(writes.at(-1)?.descriptionDoc)).toContain(`oriens-attachment:${attachment}`);
  expect(JSON.stringify(writes.at(-1)?.descriptionDoc)).not.toContain('signature=');
});

test('reordena o bloco pelo menu do teclado', async ({ page, colorScheme }, testInfo) => {
  const { panel, writes } = await openTask(page, colorScheme, {
    ...initial, descriptionDoc: doc(paragraph('Primeiro'), paragraph('Segundo'), paragraph('Terceiro'), { type: 'horizontalRule' }),
  });
  await panel.getByRole('button', { name: 'Editar descrição' }).click();
  const editor = panel.getByRole('textbox', { name: 'Descrição', exact: true });
  await editor.press('Escape');
  await expect(editor).toHaveCount(0);
  expect(writes).toHaveLength(0);
  await panel.getByRole('button', { name: 'Editar descrição' }).click();
  await editor.getByText('Segundo', { exact: true }).click();
  await panel.getByRole('button', { name: 'Mover bloco', exact: true }).first().press('Enter');
  await page.getByRole('menuitem', { name: 'Mover para cima' }).press('Enter');
  await expect(editor.locator('p').first()).toHaveText('Segundo');
  await expect.poll(() => writes.at(-1)?.descriptionDoc?.content.content?.[0]?.content?.[0]?.text).toBe('Segundo');
  await panel.screenshot({ path: testInfo.outputPath('description-editing.png') });
});

test('rola o painel pelas setas ao abrir e depois de clicar no texto', async ({ page, colorScheme }) => {
  const document = doc(...Array.from({ length: 40 }, (_, index) => paragraph(`Verificação ${index + 1} do contrato.`)));
  const { panel } = await openTask(page, colorScheme, { ...initial, descriptionDoc: document });
  const scroller = panel.locator(':scope > [tabindex="-1"]');
  const scrollTop = () => scroller.evaluate(element => element.scrollTop);
  await expect(scroller).toBeFocused();
  await panel.getByRole('button', { name: 'Mostrar tudo' }).click();
  await panel.getByText('Verificação 1 do contrato.').dblclick();
  await expect(scroller).toBeFocused();
  expect(await page.evaluate(() => getSelection()?.toString().trim())).toBeTruthy();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('PageDown');
  await expect.poll(scrollTop).toBeGreaterThan(0);
});
