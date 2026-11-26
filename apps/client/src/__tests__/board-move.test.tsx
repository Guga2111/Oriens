import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { ProjectBoard } from '@/components/projects/ProjectBoard';
import { useProjectBoard } from '@/hooks/useWork';
import api from '@/services/api';
import type { BoardResponse, WorkTask } from '@/types/work';
import { board, renderWork, task } from './work-fixtures';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), warning: vi.fn() } }));

const first = { ...task, dueDate: '2026-11-30', plannedDate: '2026-11-28',
  labels: [{ id: 3, name: 'Interface', color: 'BLUE' as const, version: 0 }] };
const second = { ...task, id: 43, title: 'Revisar os campos', position: 1 };
const initial: BoardResponse = {
  ...board,
  tasks: [first, second],
  columns: board.columns.map(column => column.id === 11 ? { ...column, totalCount: 2, visibleCount: 2 } : column),
  total: { ...board.total, totalTasks: 2, nonCancelledTasks: 2 },
  visible: { ...board.visible, totalTasks: 2, nonCancelledTasks: 2 },
};

function Board() {
  const { data } = useProjectBoard(9);
  return data && <ProjectBoard board={data} filters={{}} pendingColumnId={11}
    onOpen={vi.fn()} onEdit={vi.fn()} onAdd={vi.fn()} onObjective={vi.fn()} />;
}

function card(title: string) {
  const article = screen.getByRole('button', { name: title }).closest('article');
  if (!article) throw new Error('Card ausente');
  return article;
}

const column = (name: string) => screen.getByRole('region', { name });
const menuButton = (title: string) => screen.getByRole('button', { name: `Ações da tarefa ${title}` });

async function selectMove(title: string, action: string) {
  await userEvent.click(menuButton(title));
  await userEvent.click(screen.getByRole('menuitem', { name: action }));
}

function pendingResponse() {
  type Response = Awaited<ReturnType<typeof api.patch>>;
  let resolve: (value: Response) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<Response>((resolveResponse, rejectResponse) => {
    resolve = resolveResponse;
    reject = rejectResponse;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue({ data: initial });
});

it.each([
  [409, 'Os dados mudaram em outra sessão.'],
  [500, 'Não foi possível salvar.'],
])('projeta o destino e restaura a origem com toast após HTTP %i', async (status, message) => {
  const response = pendingResponse();
  vi.mocked(api.patch).mockReturnValueOnce(response.promise);
  renderWork(<Board />);
  await screen.findByRole('button', { name: first.title });

  expect(within(card(first.title)).getByText('#42')).toBeVisible();
  expect(within(card(first.title)).getByText('28/11/2026')).toBeVisible();
  expect(within(card(first.title)).getByText('Interface')).toBeVisible();
  expect(within(card(first.title)).queryByText(first.description)).toBeNull();
  expect(within(card(first.title)).queryByText(/Prazo:/)).toBeNull();

  await selectMove(first.title, 'Fazendo · Em andamento');
  await waitFor(() => expect(column('Fazendo')).toContainElement(card(first.title)));
  await waitFor(() => expect(card(first.title)).toHaveAttribute('aria-busy', 'true'));
  expect(menuButton(first.title)).toBeDisabled();
  expect(menuButton(second.title)).toBeEnabled();

  response.reject({ isAxiosError: true, response: { status } });
  await waitFor(() => expect(column('A fazer')).toContainElement(card(first.title)));
  await waitFor(() => expect(menuButton(first.title)).toBeEnabled());
  expect(toast.error).toHaveBeenCalledWith(expect.stringContaining(message));
  expect(screen.queryByRole('alert')).toBeNull();
});

it('preserva o movimento enfileirado quando o primeiro falha e revalida o sucesso', async () => {
  const firstResponse = pendingResponse();
  const secondResponse = pendingResponse();
  vi.mocked(api.patch).mockReturnValueOnce(firstResponse.promise).mockReturnValueOnce(secondResponse.promise);
  renderWork(<Board />);
  await screen.findByRole('button', { name: first.title });

  await selectMove(first.title, 'Fazendo · Em andamento');
  await selectMove(second.title, 'Concluídas · Concluída');
  await waitFor(() => expect(column('Concluídas')).toContainElement(card(second.title)));
  await waitFor(() => expect(card(second.title)).toHaveAttribute('aria-busy', 'true'));
  expect(api.patch).toHaveBeenCalledTimes(1);

  firstResponse.reject({ isAxiosError: true, response: { status: 500 } });
  await waitFor(() => expect(column('A fazer')).toContainElement(card(first.title)));
  expect(column('Concluídas')).toContainElement(card(second.title));
  await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(2));

  const moved: WorkTask = { ...second, columnId: 13, column: board.columns[2], status: 'CONCLUDED', version: 3 };
  vi.mocked(api.get).mockResolvedValue({ data: { ...initial, projectVersion: 5, tasks: [first, moved],
    columns: initial.columns.map(column => column.id === 11 || column.id === 13 ? { ...column, totalCount: 1, visibleCount: 1 } : column) } });
  secondResponse.resolve({ data: { task: moved, affectedProjectIds: [9], previousPlannedDate: null, plannedDate: null } });
  await waitFor(() => expect(menuButton(second.title)).toBeEnabled());
  expect(column('Concluídas')).toContainElement(card(second.title));
  expect(api.get).toHaveBeenCalledTimes(3);
});

it('reordena pelo menu e usa as versões confirmadas ao enviar o próximo card', async () => {
  const response = pendingResponse();
  vi.mocked(api.patch).mockReturnValueOnce(response.promise);
  renderWork(<Board />);
  await screen.findByRole('button', { name: first.title });

  await selectMove(first.title, 'Mover abaixo');
  const titles = () => within(column('A fazer')).getAllByRole('article').map(article => article.querySelector('[aria-haspopup=dialog]')?.textContent);
  await waitFor(() => expect(titles()).toEqual([second.title, first.title]));
  await selectMove(second.title, 'Fazendo · Em andamento');
  expect(column('Fazendo')).toContainElement(card(second.title));
  const moved = { ...first, position: 1, version: 3, project: { ...first.project, version: 5 } };
  vi.mocked(api.get).mockResolvedValue({ data: { ...initial, projectVersion: 5, tasks: [{ ...second, position: 0, version: 3 }, moved] } });
  vi.mocked(api.patch).mockRejectedValueOnce({ isAxiosError: true, response: { status: 500 } });
  response.resolve({ data: { task: moved, affectedProjectIds: [9], previousPlannedDate: moved.plannedDate, plannedDate: moved.plannedDate } });

  await waitFor(() => expect(api.patch).toHaveBeenNthCalledWith(2, '/task/43', {
    version: 3, projectVersion: 5, columnId: 12, beforeTaskId: null,
  }));
  await waitFor(() => expect(titles()).toEqual([second.title, first.title]));
  await waitFor(() => expect(menuButton(second.title)).toBeEnabled());
});
