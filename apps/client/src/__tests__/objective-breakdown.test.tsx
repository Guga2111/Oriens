import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { ObjectiveBreakdown } from '@/components/projects/ObjectiveBreakdown';
import { renderWork, task } from './work-fixtures';
import type { WorkTask } from '@/types/work';

const alpha = { id: 1, name: 'Produto', color: 'BLUE' as const, version: 0 };
const beta = { id: 2, name: 'Revisão', color: 'GREEN' as const, version: 0 };
const tasks: WorkTask[] = [
  { ...task, id: 1, status: 'CONCLUDED', priority: 'HIGH', labels: [alpha, beta] },
  { ...task, id: 2, status: 'ON_DOING', priority: 'HIGH', labels: [alpha] },
  { ...task, id: 3, status: 'BACKLOG', priority: 'MEDIUM', labels: [] },
  { ...task, id: 4, status: 'CANCELLED', priority: 'LOW' },
];
const row = (name: string) => within(screen.getByRole('tabpanel')).getByText(name).closest('dt')!.parentElement!;

it('mostra apenas Estado, Etiquetas e Prioridades e inclui canceladas no denominador', () => {
  renderWork(<ObjectiveBreakdown tasks={tasks} />);
  expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Estado', 'Etiquetas', 'Prioridades']);
  expect(row('Backlog')).toHaveTextContent('1'); expect(row('Backlog')).toHaveTextContent('25%');
  expect(row('A fazer')).toHaveTextContent('0%');
  expect(row('Cancelada')).toHaveTextContent('25%');
  expect(screen.getByText(/sobre 4 tarefas vinculadas, incluindo canceladas/)).toBeInTheDocument();
});

it('agrupa por etiqueta e conta tarefas sem etiquetas sem dividir o denominador por vínculos', async () => {
  renderWork(<ObjectiveBreakdown tasks={tasks} />);
  await userEvent.click(screen.getByRole('tab', { name: 'Etiquetas' }));
  expect(row('Produto')).toHaveTextContent('2'); expect(row('Produto')).toHaveTextContent('50%');
  expect(row('Revisão')).toHaveTextContent('25%');
  expect(row('Sem etiquetas')).toHaveTextContent('2'); expect(row('Sem etiquetas')).toHaveTextContent('50%');
  expect(screen.getByText('Uma tarefa pode aparecer em mais de uma etiqueta.')).toBeInTheDocument();
});

it('agrupa prioridades e alterna abas pelo teclado', async () => {
  renderWork(<ObjectiveBreakdown tasks={tasks} />);
  screen.getByRole('tab', { name: 'Estado' }).focus();
  await userEvent.keyboard('{End}');
  expect(screen.getByRole('tab', { name: 'Prioridades' })).toHaveAttribute('aria-selected', 'true');
  expect(row('Alta')).toHaveTextContent('2'); expect(row('Alta')).toHaveTextContent('50%');
  expect(row('Média')).toHaveTextContent('25%'); expect(row('Baixa')).toHaveTextContent('25%');
});

it('mantém percentuais em zero sem tarefas e diferencia ausência de dados de uma lista vazia', async () => {
  const { unmount } = renderWork(<ObjectiveBreakdown tasks={[]} />);
  expect(row('Backlog')).toHaveTextContent('0%');
  await userEvent.click(screen.getByRole('tab', { name: 'Etiquetas' }));
  expect(row('Sem etiquetas')).toHaveTextContent('0%');
  expect(screen.getByText('Nenhuma tarefa vinculada.')).toBeInTheDocument();
  unmount();
  renderWork(<ObjectiveBreakdown />);
  expect(screen.getByText(/Distribuição indisponível/)).toBeInTheDocument();
  expect(screen.queryByRole('tab')).not.toBeInTheDocument();
});

it('oferece nova tentativa quando os dados falham', async () => {
  const onReload = vi.fn();
  renderWork(<ObjectiveBreakdown error={new Error('Falha')} onReload={onReload} />);
  await userEvent.click(screen.getByRole('button', { name: 'Recarregar distribuição' }));
  expect(onReload).toHaveBeenCalledOnce();
});
