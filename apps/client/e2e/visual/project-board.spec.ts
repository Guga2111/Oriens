import { expect, test, type Page } from '@playwright/test';
import type { BoardResponse, WorkProject, WorkTask } from '../../src/types/work';
import { prepareVisualPage } from './fixtures';

const counts = { totalTasks: 2, nonCancelledTasks: 2, completedTasks: 0, cancelledTasks: 0 };
const project: WorkProject = {
  id: 9, userId: 1, title: 'Lançamento do portfólio', description: null, color: null, imageUrl: null,
  mode: 'DEVELOPMENT', version: 4, favorite: false, archived: false, lastAccessed: null,
  defaultPendingColumnId: 11, defaultCompletedColumnId: 13, objectives: [],
  summary: { ...counts, totalObjectives: 0, completedObjectives: 0, plannedTodayCount: 1,
    previousPlansCount: 0, overdueTaskCount: 0, dueTodayTaskCount: 0, overdueObjectiveCount: 0,
    nextPlannedTask: null, nextObjective: null },
};
const columns: BoardResponse['columns'] = [
  { id: 11, projectId: 9, name: 'A fazer', kind: 'PENDING', position: 0, version: 0, totalCount: 2, visibleCount: 2 },
  { id: 12, projectId: 9, name: 'Fazendo', kind: 'ON_DOING', position: 1, version: 0, totalCount: 0, visibleCount: 0 },
  { id: 13, projectId: 9, name: 'Concluídas', kind: 'CONCLUDED', position: 2, version: 0, totalCount: 0, visibleCount: 0 },
];
const task: WorkTask = {
  id: 101, userId: 1, title: 'Revisar a página de serviços', description: 'Conferir o texto e os links principais.',
  projectId: 9, objectiveId: null, columnId: 11, position: 0, plannedDate: '2026-11-25', startTime: '14:00:00',
  dueDate: '2026-11-28', completedAt: null, createdAt: '2026-11-25T15:00:00Z', priority: 'HIGH',
  status: 'PENDING', location: null, version: 1, project, objective: null, column: columns[0],
  labels: [{ id: 1, name: 'Site', color: 'BLUE', version: 0 }],
};
const secondTask: WorkTask = {
  ...task, id: 102, title: 'Publicar FAQ do portfólio', position: 1, priority: 'MEDIUM',
  description: null, plannedDate: null, startTime: null, dueDate: null, labels: [],
};
const board: BoardResponse = {
  projectId: 9, projectVersion: 4, filtered: false, columns, tasks: [task, secondTask], total: counts, visible: counts,
};

async function prepareBoard(page: Page, theme: 'light' | 'dark') {
  const unexpected = await prepareVisualPage(page, theme, true);
  await page.route('**/visual-api/work/home/recents', route => route.fulfill({ status: 204 }));
  await page.route('**/visual-api/project/9', route => route.fulfill({ json: project }));
  await page.route('**/visual-api/project/9/board', route => route.fulfill({ json: board }));
  await page.route('**/visual-api/task/101', route => route.fulfill({ json: task }));
  await page.goto('/tasks/project/9?tab=board');
  const region = page.getByRole('region', { name: 'Quadro do projeto' });
  await expect(region.getByRole('button', { name: task.title, exact: true })).toBeVisible();
  return { region, unexpected };
}

test('quadro do projeto em claro e escuro', async ({ page, colorScheme }) => {
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const { region, unexpected } = await prepareBoard(page, theme);
  await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
  expect(await page.evaluate(async () => {
    const fonts = await document.fonts.load('400 16px Inter');
    await document.fonts.ready;
    return fonts.some(font => font.family === 'Inter' && font.status === 'loaded');
  })).toBe(true);
  await page.mouse.move(-1, -1);
  await expect(region).toHaveScreenshot('project-board.png');
  expect(unexpected).toEqual([]);
});

test.describe('interação no quadro desktop', () => {
  test.use({ reducedMotion: 'no-preference' });
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 640, 'A coluna única usa o menu para mover.');

  test('arrasta pelo ID, mantém outro card disponível e reverte erros', async ({ page, colorScheme }, testInfo) => {
    const { region, unexpected } = await prepareBoard(page, colorScheme === 'dark' ? 'dark' : 'light');
    const first = region.locator('article').filter({ has: page.getByRole('button', { name: task.title, exact: true }) });
    const second = region.locator('article').filter({ has: page.getByRole('button', { name: secondTask.title, exact: true }) });
    const doing = region.getByRole('region', { name: 'Fazendo' });
    const done = region.getByRole('region', { name: 'Concluídas' });
    const pending = region.getByRole('region', { name: 'A fazer' });
    const responses = [Promise.withResolvers<number>(), Promise.withResolvers<number>()];
    const writes: number[] = [];
    for (const [index, candidate] of [task, secondTask].entries()) {
      await page.route(`**/visual-api/task/${candidate.id}`, async route => {
        expect(route.request().method()).toBe('PATCH');
        writes.push(candidate.id);
        await route.fulfill({ status: await responses[index].promise, json: { message: 'Erro ao mover no quadro.' } });
      });
    }
    const center = async (locator: ReturnType<Page['locator']>) => {
      const box = await locator.boundingBox();
      if (!box) throw new Error('Alvo do arraste ausente.');
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    async function startDrag(from: ReturnType<Page['locator']>) {
      const start = await center(from);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(start.x + 10, start.y, { steps: 2 });
    }
    async function releaseIn(destination: ReturnType<Page['locator']>) {
      const end = await center(destination);
      await page.mouse.move(end.x, end.y, { steps: 10 });
      await page.mouse.up();
    }

    await startDrag(first.getByText('Site', { exact: true }));
    await releaseIn(doing);
    await expect(pending.getByRole('button', { name: task.title, exact: true })).toBeVisible();
    expect(writes).toEqual([]);

    await startDrag(first.getByText('#101', { exact: true }));
    const overlay = region.locator('article[aria-hidden=true]');
    await expect(overlay).toContainText('#101');
    await expect(overlay).toContainText(task.title);
    await expect(overlay).toContainText('Alta');
    await expect(overlay).toContainText('Hoje');
    await expect(overlay).toContainText('Site');
    await overlay.screenshot({ path: testInfo.outputPath('arraste.png') });
    await releaseIn(doing);
    await expect(doing.getByRole('button', { name: task.title, exact: true })).toBeVisible();
    await expect(first).toHaveAttribute('aria-busy', 'true');
    await expect(first.getByRole('button', { name: /Ações da tarefa/ })).toBeDisabled();
    await expect(second.getByRole('button', { name: /Ações da tarefa/ })).toBeEnabled();
    await expect.poll(() => writes).toEqual([101]);

    await startDrag(second.getByRole('button', { name: secondTask.title, exact: true }));
    await releaseIn(done);
    await expect(done.getByRole('button', { name: secondTask.title, exact: true })).toBeVisible();
    expect(writes).toEqual([101]);

    responses[0].resolve(409);
    await expect(pending.getByRole('button', { name: task.title, exact: true })).toBeVisible();
    await expect(page.getByText(/Os dados mudaram em outra sessão/)).toBeVisible();
    await expect(done.getByRole('button', { name: secondTask.title, exact: true })).toBeVisible();
    await expect.poll(() => writes).toEqual([101, 102]);

    responses[1].resolve(500);
    await expect(pending.getByRole('button', { name: secondTask.title, exact: true })).toBeVisible();
    await expect(page.getByText('Erro ao mover no quadro.')).toBeVisible();
    expect(unexpected).toEqual([]);
  });

  test('abre detalhes com Enter e arrasta com Espaço, setas e Escape', async ({ page, colorScheme }) => {
    const { region } = await prepareBoard(page, colorScheme === 'dark' ? 'dark' : 'light');
    const title = region.getByRole('button', { name: task.title, exact: true });
    await title.focus();
    await page.keyboard.press('Space');
    const announcement = region.getByText(`Arrastando ${task.title}.`, { exact: true });
    await expect(announcement).toHaveCount(1);
    await page.keyboard.press('ArrowDown');
    await expect(region.getByText(`Destino: ${secondTask.title}.`, { exact: true })).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(region.getByText('Movimento cancelado.', { exact: true })).toHaveCount(1);
    await expect(title).toBeFocused();

    await page.keyboard.press('Enter');
    const detail = page.getByRole('dialog', { name: task.title });
    await expect(detail).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(detail).toBeHidden();
    await title.click();
    await expect(detail).toBeVisible();
  });
});
