import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { DashboardPage } from '@/pages/DashboardPage';
import api from '@/services/api';
import { renderWork, task } from './work-fixtures';
import type { DayResponse } from '@/types/work';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/hooks/useSound', () => ({ useSound: () => vi.fn() }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn() } }));

const emptyDay = (date: string): DayResponse => ({ date, timezone: 'America/Recife', planned: [], completed: [], previousPlans: [], deadlineAttention: [] });

it('consome DayResponse com planejadas/concluídas e RangeResponse com tasks ao trocar visão', async () => {
  vi.mocked(api.get).mockImplementation(async (url, config) => {
    if (url === '/task/user/7/range') {
      return { data: { startDate: config.params.startDate, endDate: config.params.endDate, timezone: 'America/Recife', tasks: [
        { ...task, id: 3, title: 'Tarefa da semana', plannedDate: config.params.startDate, dueDate: '1990-01-01' },
      ] } };
    }
    return { data: { ...emptyDay(config.params.date), planned: [{ ...task, title: 'Planejada do dia', startTime: '09:00:00' }], completed: [
      { ...task, id: 2, title: 'Concluída do dia', status: 'CONCLUDED', startTime: '10:00:00' },
    ] } };
  });
  renderWork(<DashboardPage />);
  const morning = (await screen.findByRole('heading', { name: 'Manhã' })).closest('section')!;
  expect(await within(morning).findByText('Planejada do dia')).toBeInTheDocument();
  expect(within(morning).getByText('Concluída do dia')).toHaveClass('line-through');
  expect(await screen.findByText('Concluída do dia')).toBeInTheDocument();
  expect(screen.getByText(/1 de 2 concluídas/)).toBeInTheDocument();
  expect(api.get).not.toHaveBeenCalledWith('/task/user/7/range', expect.anything());

  await userEvent.click(screen.getByRole('radio', { name: 'Ver semana' }));
  expect(await screen.findByText('Tarefa da semana')).toBeInTheDocument();
  expect(screen.queryByText('Planejada do dia')).not.toBeInTheDocument();
  expect(screen.getByText('0 de 1 concluídas nesta semana')).toBeInTheDocument();
});

it('não aplica resposta do dia anterior depois da navegação', async () => {
  let resolveOld: (response: { data: DayResponse }) => void;
  let firstDate: string;
  vi.mocked(api.get).mockImplementation((_url, config) => {
    firstDate ??= config.params.date;
    if (config.params.date === firstDate) return new Promise(resolve => { resolveOld = resolve; });
    return Promise.resolve({ data: { ...emptyDay(config.params.date), planned: [{ ...task, title: 'Dia selecionado', startTime: '12:00:00' }] } });
  });
  renderWork(<DashboardPage />);
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
  await userEvent.click(screen.getByRole('button', { name: 'Próximo dia' }));
  const afternoon = (await screen.findByRole('heading', { name: 'Tarde' })).closest('section')!;
  expect(await within(afternoon).findByText('Dia selecionado')).toBeInTheDocument();
  resolveOld!({ data: { ...emptyDay(firstDate!), planned: [{ ...task, title: 'Resposta antiga', startTime: '12:00:00' }] } });
  await waitFor(() => expect(screen.queryByText('Resposta antiga')).not.toBeInTheDocument());
  expect(await within(afternoon).findByText('Dia selecionado')).toBeInTheDocument();
});

it('falha de consulta permite tentar novamente com o novo envelope vazio', async () => {
  vi.mocked(api.get).mockRejectedValueOnce(new Error('offline'))
    .mockImplementation(async (_url, config) => ({ data: emptyDay(config.params.date) }));
  renderWork(<DashboardPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar suas tarefas.');
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByText('Nenhuma tarefa')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
