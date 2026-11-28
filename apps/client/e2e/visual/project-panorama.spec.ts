import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import type { BoardResponse, ProjectActivityPage, TaskDescriptionDocument, WorkProject } from '../../src/types/work';
import { prepareVisualPage } from './fixtures';

const project: WorkProject = {
  id: 9, userId: 1, title: 'Lançamento do portfólio', description: 'Contexto original.\n\nEntregar a primeira versão.',
  color: null, imageUrl: null, mode: 'DEVELOPMENT', version: 4, favorite: false, archived: false,
  lastAccessed: null, defaultPendingColumnId: 11, defaultCompletedColumnId: 13, objectives: [],
  summary: {
    totalObjectives: 0, completedObjectives: 0, totalTasks: 0, nonCancelledTasks: 0, completedTasks: 0, cancelledTasks: 0,
    plannedTodayCount: 0, previousPlansCount: 0, overdueTaskCount: 0, dueTodayTaskCount: 0,
    overdueObjectiveCount: 0, nextPlannedTask: null, nextObjective: null,
  },
};
const counts = { totalTasks: 0, nonCancelledTasks: 0, completedTasks: 0, cancelledTasks: 0 };
const board: BoardResponse = {
  projectId: 9, projectVersion: 4, filtered: false, tasks: [], total: counts, visible: counts,
  columns: [
    { id: 11, projectId: 9, name: 'A fazer', kind: 'PENDING', position: 0, version: 0, totalCount: 0, visibleCount: 0 },
  ],
};
const cover = fileURLToPath(new URL('../../public/icon-192.png', import.meta.url));

test('Panorama edita blocos, troca a capa e mostra a atividade do projeto', async ({ page, colorScheme }, testInfo) => {
  const unexpected = await prepareVisualPage(page, colorScheme === 'dark' ? 'dark' : 'light', true);
  const activity: ProjectActivityPage = { page: 0, hasNext: false, actor: 'Conta visual', items: [] };
  let current = project;
  let failSave = true;
  function record(kind: ProjectActivityPage['items'][number]['kind']) {
    activity.items.unshift({ id: current.version, kind, occurredAt: '2026-11-25T15:00:00Z', subjectId: null, subjectTitle: null });
  }
  await page.route('**/visual-api/work/home/recents', route => route.fulfill({ status: 204 }));
  await page.route('**/visual-api/project/9/board', route => route.fulfill({ json: board }));
  await page.route('**/visual-api/project/9/activity?**', route => route.fulfill({ json: activity }));
  await page.route('**/visual-api/project/user/1/sidebar', route => route.fulfill({ json: [current] }));
  await page.route('**/visual-api/project/9/picture', route => {
    expect(route.request().method()).toBe('PUT');
    expect(route.request().headers()['if-match']).toBe('"' + current.version + '"');
    current = { ...current, imageUrl: '/icon-192.png', version: current.version + 1 };
    record('COVER_UPDATED');
    return route.fulfill({ json: current });
  });
  await page.route('**/visual-api/project/9', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: current });
    const body: { version: number; descriptionDoc: TaskDescriptionDocument } = route.request().postDataJSON();
    expect(route.request().method()).toBe('PATCH');
    expect(body.version).toBe(current.version);
    expect(body.descriptionDoc.content.content?.[0]?.type).toBe('heading');
    if (failSave) {
      failSave = false;
      return route.fulfill({ json: { message: 'Falha de salvamento.' }, status: 503 });
    }
    current = { ...current, descriptionDoc: body.descriptionDoc, description: '## Plano de entrega', version: current.version + 1 };
    record('DESCRIPTION_UPDATED');
    return route.fulfill({ json: current });
  });

  await page.goto('/tasks/project/9?tab=overview');
  const description = page.getByRole('region', { name: 'Descrição' });
  const feed = page.getByRole('region', { name: 'Atividade' });
  const trigger = description.getByRole('button', { name: 'Editar descrição' });
  await expect(description).toContainText('Contexto original.');
  await expect(feed).toContainText('As próximas mudanças');
  await trigger.press('Enter');
  const editor = description.getByRole('textbox', { name: 'Descrição', exact: true });
  await expect(editor).toBeFocused();
  await editor.press('ControlOrMeta+a');
  await editor.press('Backspace');
  await editor.pressSequentially('/h2');
  await expect(page.getByRole('option', { name: 'Título 2', exact: true })).toBeVisible();
  await editor.press('Enter');
  await editor.pressSequentially('Plano de entrega');
  const save = description.getByRole('button', { name: 'Salvar descrição' });
  await save.click();
  await expect(description.getByRole('alert')).toContainText('Falha de salvamento.');
  await expect(editor.getByRole('heading', { name: 'Plano de entrega', level: 2 })).toBeVisible();
  await save.click();
  await expect(description.getByRole('heading', { name: 'Plano de entrega', level: 2 })).toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(feed).toContainText('Conta visual editou a descrição');

  const picker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Adicionar capa', exact: true }).click();
  await (await picker).setFiles(cover);
  const banner = page.getByRole('img', { name: 'Capa de Lançamento do portfólio' });
  await expect(banner).toBeVisible();
  expect((await banner.boundingBox())?.height).toBeLessThanOrEqual(192);
  await expect(feed).toContainText('Conta visual atualizou a capa');
  const icons = await feed.locator('li svg[aria-hidden="true"]').evaluateAll(elements => elements.map(icon => icon.innerHTML));
  expect(new Set(icons).size).toBe(2);

  await page.reload();
  await expect(description.getByRole('heading', { name: 'Plano de entrega', level: 2 })).toBeVisible();
  await expect(banner).toBeVisible();
  await expect(page.getByRole('button', { name: 'Trocar capa', exact: true })).toBeVisible();
  const summary = page.getByRole('complementary', { name: 'Informações do projeto' });
  await expect(summary.getByRole('region', { name: 'Objetivos por estágio' })).toContainText('Nenhum objetivo definido.');
  await expect(summary.getByRole('region', { name: 'Tarefas por coluna' })).toContainText('Nenhuma tarefa no projeto.');
  await expect(summary.getByRole('heading', { name: 'Calendário' })).toHaveCount(0);
  await expect.poll(() => page.locator('[data-page-content]').evaluate(element => element.scrollWidth - element.clientWidth)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('panorama.png') });

  const properties = page.getByRole('region', { name: 'Propriedades' });
  const [descriptionBox, summaryBox, propertiesBox, feedBox] =
    await Promise.all([description, summary, properties, feed].map(region => region.boundingBox()));
  if (!descriptionBox || !summaryBox || !propertiesBox || !feedBox) throw new Error('Blocos do Panorama indisponíveis.');
  if (testInfo.project.name.startsWith('mobile')) {
    expect(summaryBox.y).toBeGreaterThan(descriptionBox.y + descriptionBox.height);
    expect(propertiesBox.y).toBeGreaterThan(summaryBox.y + summaryBox.height);
    expect(feedBox.y).toBeGreaterThan(propertiesBox.y + propertiesBox.height);
  } else {
    expect(propertiesBox.x).toBeGreaterThan(descriptionBox.x + descriptionBox.width);
    expect(summaryBox.y).toBeGreaterThan(propertiesBox.y + propertiesBox.height);
    expect(feedBox.x).toBe(descriptionBox.x);
    expect(feedBox.y - (descriptionBox.y + descriptionBox.height)).toBeLessThanOrEqual(32);
  }

  const status = properties.getByRole('button', { name: 'Situação: Ativo' });
  await status.press('Enter');
  await expect(page.getByRole('menuitemradio', { name: 'Ativo' })).toHaveAttribute('aria-checked', 'true');
  await page.screenshot({ path: testInfo.outputPath('project-status.png') });
  await page.keyboard.press('Escape');
  await expect(status).toBeFocused();
  const color = properties.getByRole('button', { name: 'Cor: Sem cor' });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await color.press('Enter');
  const colorPicker = page.getByRole('dialog', { name: 'Editar cor do projeto' });
  await expect(colorPicker).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(colorPicker.getByLabel('Cor do projeto')).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('project-color.png') });
  await page.keyboard.press('Escape');
  await expect(color).toBeFocused();

  for (const [tab, content] of [['board', 'Quadro do projeto'], ['objectives', 'Objetivos']]) {
    await page.goto(`/tasks/project/9?tab=${tab}`);
    await expect(page.getByRole('region', { name: content, exact: true })).toBeVisible();
    if (tab === 'board') await expect(page.getByText('Nenhuma tarefa nesta coluna.')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`${tab}.png`) });
    await expect.soft(banner).toHaveCount(0, { timeout: 1000 });
  }
  expect(unexpected).toEqual([]);
});
