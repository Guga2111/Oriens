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
const board: BoardResponse = { projectId: 9, projectVersion: 4, filtered: false, columns: [], tasks: [], total: counts, visible: counts };
const cover = fileURLToPath(new URL('../../public/icon-192.png', import.meta.url));

test('Panorama edita blocos, troca a capa e mostra a atividade do projeto', async ({ page, colorScheme }) => {
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
  await expect(feed).toContainText('Conta visual atualizou a capa');
  const icons = await feed.locator('li svg[aria-hidden="true"]').evaluateAll(elements => elements.map(icon => icon.innerHTML));
  expect(new Set(icons).size).toBe(2);

  await page.reload();
  await expect(description.getByRole('heading', { name: 'Plano de entrega', level: 2 })).toBeVisible();
  await expect(banner).toBeVisible();
  await expect(page.getByRole('button', { name: 'Trocar capa', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Próximo mês' })).toBeVisible();
  await expect.poll(() => page.locator('[data-page-content]').evaluate(element => element.scrollWidth - element.clientWidth)).toBe(0);
  expect(unexpected).toEqual([]);
});
