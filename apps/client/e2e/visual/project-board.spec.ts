import { expect, test, type Locator, type Page } from '@playwright/test';
import type { BoardResponse, WorkProject, WorkTask } from '../../src/types/work';
import { prepareVisualPage } from './fixtures';

test.use({ video: 'retain-on-failure' });

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

async function prepareBoard(page: Page, theme: 'light' | 'dark', initialBoard = board) {
  const unexpected = await prepareVisualPage(page, theme, true);
  await page.route('**/visual-api/work/home/recents', route => route.fulfill({ status: 204 }));
  await page.route('**/visual-api/project/9', route => route.fulfill({ json: project }));
  await page.route('**/visual-api/project/9/board', route => route.fulfill({ json: initialBoard }));
  await page.route('**/visual-api/task/101', route => route.fulfill({ json: task }));
  await page.goto('/tasks/project/9?tab=board');
  const region = page.getByRole('region', { name: 'Quadro do projeto' });
  await expect(region.getByRole('button', { name: task.title, exact: true })).toBeVisible();
  return { region, unexpected };
}

async function pickTaskWithKeyboard(page: Page, region: Locator) {
  const title = region.getByRole('button', { name: task.title, exact: true });
  await page.evaluate(async () => { await document.fonts.ready; });
  await title.focus();
  await page.keyboard.press('Space');
  await expect(region.locator('article[aria-hidden=true]')).toBeVisible();
  // The keyboard sensor installs its document listener after the activation event.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  return title;
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

test('busca do quadro no cabeçalho envia o termo e preserva os demais filtros', async ({ page, colorScheme, viewport }, testInfo) => {
  if (viewport && viewport.width < 1024) await page.setViewportSize({ ...viewport, width: 360 });
  const { unexpected } = await prepareBoard(page, colorScheme === 'dark' ? 'dark' : 'light');
  await page.route(url => url.pathname === '/visual-api/project/9/board' && !!url.search,
    route => route.fulfill({ json: { ...board, filtered: true } }));
  const search = page.getByRole('search', { name: 'Buscar tarefas' });
  await search.getByRole('button', { name: 'Buscar tarefas' }).click();
  const input = search.getByRole('searchbox', { name: 'Buscar por título ou descrição' });
  await expect(input).toBeFocused();
  await input.fill('  Revisar  ');
  await expect(page).toHaveURL(/\?tab=board$/);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  const request = page.waitForRequest(req => {
    const url = new URL(req.url());
    return url.pathname === '/visual-api/project/9/board' && url.searchParams.get('search') === 'Revisar';
  });
  await input.press('Enter');
  await expect(page).toHaveURL(/search=Revisar$/);
  await request;
  await page.reload();
  await expect(input).toHaveValue('Revisar');
  await page.screenshot({ path: testInfo.outputPath('board-header-search.png') });

  const filters = page.getByRole('dialog', { name: 'Filtros do quadro' });
  await page.getByRole('button', { name: /^Filtros do quadro/ }).click();
  await expect(filters.getByRole('button', { name: 'Busca', exact: true })).toHaveCount(0);
  await filters.getByRole('button', { name: 'Status' }).click();
  await filters.getByRole('checkbox', { name: 'A fazer' }).click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await search.getByRole('button', { name: 'Limpar busca' }).click();
  await expect(page).toHaveURL(/\?tab=board&status=PENDING$/);
  expect(unexpected).toEqual([]);
});

test('painel de filtros do quadro em claro e escuro', async ({ page, colorScheme, viewport }, testInfo) => {
  const { region, unexpected } = await prepareBoard(page, colorScheme === 'dark' ? 'dark' : 'light');
  const filteredBoard: BoardResponse = {
    ...board, filtered: true, tasks: [task],
    columns: columns.map(column => column.id === task.columnId ? { ...column, visibleCount: 1 } : column),
    visible: { ...counts, totalTasks: 1, nonCancelledTasks: 1 },
  };
  await page.route(url => url.pathname === '/visual-api/project/9/board' && !!url.search,
    route => route.fulfill({ json: filteredBoard }));
  const trigger = page.locator('button[aria-label^="Filtros do quadro"]');
  await trigger.focus();
  await page.keyboard.press('Enter');
  const panel = page.getByRole('dialog', { name: 'Filtros do quadro' });
  const mobile = (viewport?.width ?? 0) < 1024;
  const status = panel.getByRole('button', { name: 'Status' });
  await expect(status).toBeFocused();
  await expect(panel.getByRole('checkbox', { name: 'A fazer' })).toBeHidden();
  await expect(panel.getByRole('button', { name: 'Fechar' })).toHaveCount(mobile ? 1 : 0);
  await page.screenshot({ path: testInfo.outputPath('filter-categories.png') });
  for (const name of ['Etiqueta', 'Objetivo', 'Planejamento', 'Período']) {
    const category = panel.getByRole('button', { name, exact: true });
    await category.click();
    const heading = page.getByRole('heading', { name, exact: true });
    const section = panel.locator('section').filter({ has: heading });
    await expect(section.getByText(name, { exact: true })).toHaveCount(1);
    await expect(section.getByRole('combobox', { name, exact: true })).toBeVisible();
    if (name !== 'Período') {
      await page.keyboard.press('Escape');
      await expect(category).toBeFocused();
    }
  }
  await page.screenshot({ path: testInfo.outputPath('filter-period.png') });

  await panel.getByRole('combobox', { name: 'Período' }).click();
  await page.getByRole('option', { name: 'Últimos 7 dias' }).click();
  await panel.getByRole('combobox', { name: 'Período' }).click();
  await page.getByRole('option', { name: 'Personalizado' }).click();
  await panel.getByRole('button', { name: /Data inicial: 19\/11\/2026/ }).click();
  await page.getByRole('grid', { name: 'novembro 2026' }).getByRole('gridcell', { name: '18', exact: true }).click();
  if (mobile) await panel.getByRole('button', { name: 'Voltar aos filtros' }).click();
  await status.click();
  await panel.getByRole('checkbox', { name: 'A fazer' }).click();
  await panel.getByRole('checkbox', { name: 'Em andamento' }).click();
  await expect(trigger).toHaveAttribute('aria-label', 'Filtros do quadro (2 ativos)');
  await expect(page).toHaveURL(/status=PENDING%2CON_DOING/);
  await expect(page).toHaveURL(/startDate=2026-11-18/);
  await expect(region.getByText('1 de 2')).toBeVisible();
  if (mobile) await panel.getByRole('button', { name: 'Voltar aos filtros' }).click();
  const priority = panel.getByRole('button', { name: 'Prioridade' });
  await priority.focus();
  await page.keyboard.press('Enter');
  await expect(panel.getByRole('heading', { name: 'Prioridade' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(panel.getByRole('checkbox', { name: 'Urgente' })).toBeFocused();
  await panel.getByRole('checkbox', { name: 'Alta' }).click();
  await expect(trigger).toHaveAttribute('aria-label', 'Filtros do quadro (3 ativos)');
  await expect(page).toHaveURL(/priority=HIGH/);
  await page.mouse.move(-1, -1);
  await expect(page).toHaveScreenshot('project-board-filters.png');

  await panel.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(panel.getByRole('checkbox', { name: 'Alta' })).not.toBeChecked();
  await page.keyboard.press('Escape');
  await expect(priority).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(/\?tab=board$/);
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
    const title = await pickTaskWithKeyboard(page, region);
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
    await detail.getByRole('button', { name: 'Fechar painel' }).click();
    await expect(detail).toBeHidden();
    await title.click();
    await expect(detail).toBeVisible();
  });
});

test.describe('transição ao soltar no quadro desktop', () => {
  test.use({ reducedMotion: 'no-preference' });
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 640, 'A coluna única usa o menu para mover.');

  for (const scenario of ['mesma coluna', 'coluna vazia', 'coluna com card'] as const) {
    test(`mantém a posição antecipada ao soltar na ${scenario}`, async ({ page, colorScheme }, testInfo) => {
      const sameColumn = scenario === 'mesma coluna';
      const occupied = scenario === 'coluna com card';
      const initialBoard = occupied ? {
        ...board,
        columns: columns.map(column => column.id === 13 ? column : { ...column, totalCount: 1, visibleCount: 1 }),
        tasks: [task, { ...secondTask, columnId: 12, column: columns[1], status: 'ON_DOING', position: 0 }],
      } : board;
      const { region, unexpected } = await prepareBoard(page, colorScheme === 'dark' ? 'dark' : 'light', initialBoard);
      const response = Promise.withResolvers<void>();
      const writes: unknown[] = [];
      await page.route('**/visual-api/task/101', async route => {
        writes.push(route.request().postDataJSON());
        await response.promise;
        await route.fulfill({ status: 500, json: { message: 'Erro ao mover no quadro.' } });
      });
      const title = region.getByRole('button', { name: task.title, exact: true });
      const neighbor = region.getByRole('button', { name: secondTask.title, exact: true });
      const destination = region.getByRole('region', { name: sameColumn ? 'A fazer' : 'Fazendo' });
      const source = await title.boundingBox();
      const target = await (sameColumn || occupied ? neighbor : destination).boundingBox();
      if (!source || !target) throw new Error('Alvo do arraste ausente.');
      await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
      await page.mouse.down();
      await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 });
      const overlay = region.locator('article[aria-hidden=true]');
      await expect(overlay).toBeVisible();
      await expect(destination.locator('[data-board-insertion]')).toBeVisible();
      await expect(destination).toHaveCSS('box-shadow', 'none');
      if (scenario === 'coluna vazia') await region.screenshot({ path: testInfo.outputPath('posicao-de-soltar.png') });

      const recording = await page.evaluateHandle(({ taskId, neighborId }) => {
        const card = (id: number) => document.querySelector(`[data-board-task-title="${id}"]`)?.closest('article');
        const y = (element: Element | null | undefined) => element?.getBoundingClientRect().top;
        const promise = new Promise<{
          insertion: number | undefined;
          neighborBefore: number | undefined;
          frames: { overlay: boolean; task: number | undefined; neighbor: number | undefined }[];
        }>(resolve => {
          window.addEventListener('pointerup', () => {
            const insertion = y(document.querySelector('[data-board-insertion]'));
            const neighborBefore = y(card(neighborId));
            const start = performance.now();
            const frames: { overlay: boolean; task: number | undefined; neighbor: number | undefined }[] = [];
            const sample = () => {
              const copy = document.querySelector('article[aria-hidden=true]');
              frames.push({ overlay: Boolean(copy), task: y(card(taskId)), neighbor: y(card(neighborId)) });
              if (performance.now() - start < 350) requestAnimationFrame(sample);
              else resolve({ insertion, neighborBefore, frames });
            };
            requestAnimationFrame(sample);
          }, { capture: true, once: true });
        });
        return { promise };
      }, { taskId: task.id, neighborId: secondTask.id });

      // Let the preview settle, then sample every frame during the old drop animation window.
      await region.evaluate(async element => {
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        await Promise.all(element.getAnimations({ subtree: true })
          .filter(animation => animation instanceof CSSTransition && animation.transitionProperty === 'transform')
          .map(animation => animation.finished.catch(() => undefined)));
      });
      await page.mouse.up();
      const { insertion, neighborBefore, frames } = await recording.evaluate(({ promise }) => promise);
      try {
        await expect(destination.getByRole('button', { name: task.title, exact: true })).toBeVisible();
        const finalTask = frames.at(-1)?.task ?? NaN;
        const finalNeighbor = frames.at(-1)?.neighbor ?? NaN;
        expect.soft(insertion, 'prévia da posição de inserção').toBeDefined();
        if (insertion !== undefined) expect.soft(Math.abs(finalTask - insertion), `inserção em ${insertion}, card em ${finalTask}`).toBeLessThan(2);
        expect.soft(frames.filter(frame => frame.overlay), 'quadros com uma cópia após soltar').toHaveLength(0);
        expect.soft(Math.max(...frames.map(frame => Math.abs((frame.task ?? NaN) - finalTask)))).toBeLessThan(2);
        expect.soft(Math.max(...frames.map(frame => Math.abs((frame.neighbor ?? NaN) - finalNeighbor)))).toBeLessThan(2);
        expect.soft(Math.abs((neighborBefore ?? NaN) - finalNeighbor), `vizinho em ${neighborBefore} antes e ${finalNeighbor} depois`).toBeLessThan(2);
        await expect.poll(() => writes).toEqual([expect.objectContaining({
          columnId: sameColumn ? 11 : 12, beforeTaskId: occupied ? secondTask.id : null,
        })]);
      } finally {
        response.resolve();
      }
      await expect(page.getByText('Erro ao mover no quadro.')).toBeVisible();
      await expect(region.getByRole('region', { name: 'A fazer' }).getByRole('button', { name: task.title, exact: true })).toBeVisible();
      expect(unexpected).toEqual([]);
    });
  }
});

test('com movimento reduzido, o teclado preserva a ordenação filtrada', async ({ page, colorScheme, viewport }) => {
  test.skip((viewport?.width ?? 0) < 640, 'A coluna única usa o menu para mover.');
  const { region, unexpected } = await prepareBoard(page, colorScheme === 'dark' ? 'dark' : 'light', { ...board, filtered: true });
  const title = await pickTaskWithKeyboard(page, region);
  const overlay = region.locator('article[aria-hidden=true]');
  const insertion = region.locator('[data-board-insertion]');
  await page.keyboard.press('ArrowDown');
  await expect(region.getByText(`Destino: ${secondTask.title}.`, { exact: true })).toHaveCount(1);
  await expect(insertion).toHaveCount(0);
  await page.keyboard.press('Space');
  await expect(overlay).toHaveCount(0);
  await expect(title).toBeFocused();

  await page.route('**/visual-api/task/101', route => route.fulfill({ status: 500, json: { message: 'Erro ao mover no quadro.' } }));
  await pickTaskWithKeyboard(page, region);
  await page.keyboard.press('ArrowRight');
  await expect(region.getByRole('region', { name: 'Fazendo' }).locator('[data-board-insertion]')).toBeVisible();
  const request = page.waitForRequest(req => req.url().endsWith('/visual-api/task/101') && req.method() === 'PATCH');
  await page.keyboard.press('Space');
  expect((await request).postDataJSON()).toMatchObject({ columnId: 12, beforeTaskId: null });
  await expect(overlay).toHaveCount(0);
  await expect(page.getByText('Erro ao mover no quadro.')).toBeVisible();
  await expect(title).toBeFocused();
  expect(unexpected).toEqual([]);
});

test('no celular, move pelo menu do card e mostra erro de salvamento', async ({ page, colorScheme, viewport }) => {
  test.skip((viewport?.width ?? 0) >= 640, 'No desktop o fluxo principal é o arraste.');
  const { region } = await prepareBoard(page, colorScheme === 'dark' ? 'dark' : 'light');
  await page.route('**/visual-api/task/101', route => route.fulfill({ status: 500, json: { message: 'Erro ao mover no quadro.' } }));
  await region.getByRole('button', { name: `Ações da tarefa ${task.title}` }).click();
  const request = page.waitForRequest(req => req.url().endsWith('/visual-api/task/101') && req.method() === 'PATCH');
  await page.getByRole('menuitem', { name: 'Fazendo · Em andamento' }).click();
  expect((await request).postDataJSON()).toMatchObject({ columnId: 12, beforeTaskId: null });
  await expect(page.getByText('Erro ao mover no quadro.')).toBeVisible();
  await expect(region.getByRole('region', { name: 'A fazer' }).getByRole('button', { name: task.title, exact: true })).toBeVisible();
});
