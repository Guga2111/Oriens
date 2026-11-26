import { screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ObjectiveDetails } from '@/components/projects/ObjectiveDetails';
import { objective, project, renderWork, task } from './work-fixtures';
import type { WorkTask } from '@/types/work';
vi.mock('@/hooks/useProductToday', () => ({ useProductToday: () => '2026-11-24' }));
function show(tasks?: WorkTask[], extras = {}) {
  return renderWork(<ObjectiveDetails objective={objective} project={project} tasks={tasks} busy={false} onClose={vi.fn()} onAddTask={vi.fn()} onEditTask={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onPatch={vi.fn()} onReload={vi.fn()} {...extras} />);
}
it('conta apenas tarefas abertas atrasadas vinculadas ao objetivo, sem incluir o prazo de hoje', () => {
  show([
    { ...task, id: 1, status: 'BACKLOG', dueDate: '2026-11-23' },
    { ...task, id: 2, status: 'ON_DOING', dueDate: '2026-11-23' },
    { ...task, id: 3, status: 'PENDING', dueDate: '2026-11-24' },
    { ...task, id: 4, status: 'CONCLUDED', dueDate: '2026-11-20' },
    { ...task, id: 5, status: 'CANCELLED', dueDate: '2026-11-20' },
    { ...task, id: 6, objectiveId: 99, dueDate: '2026-11-20' },
    { ...task, id: 7, dueDate: null },
  ]);
  const concerns = within(screen.getByRole('region', { name: 'Preocupações' }));
  expect(concerns.getByText('2')).toBeInTheDocument();
  expect(concerns.queryByText('Bloqueio ainda não disponível')).not.toBeInTheDocument();
});
it('mostra zero atrasadas para lista vazia e não transforma erro em zero', () => {
  const { unmount } = show([]);
  expect(within(screen.getByRole('region', { name: 'Preocupações' })).getByText('0')).toBeInTheDocument();
  unmount();
  show(undefined, { tasksError: new Error('Indisponível') });
  const concerns = within(screen.getByRole('region', { name: 'Preocupações' }));
  expect(concerns.queryByText('0')).not.toBeInTheDocument();
  expect(concerns.getByText('Dados indisponíveis')).toBeInTheDocument();
});

it('mostra a explicação de bloqueadas apenas no tooltip, por mouse e teclado', async () => {
  show([]);
  expect(screen.queryByText('Bloqueio ainda não disponível')).not.toBeInTheDocument();
  const trigger = screen.getByRole('button', { name: 'Informações sobre tarefas bloqueadas' });
  await userEvent.hover(trigger);
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Bloqueio ainda não disponível');
  await userEvent.unhover(trigger);
  trigger.focus();
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Bloqueio ainda não disponível');
});
