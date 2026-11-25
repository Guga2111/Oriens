import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { ProjectObjectives } from '@/components/projects/ProjectObjectives';
import api from '@/services/api';
import type { WorkObjective, WorkTask } from '@/types/work';
import { objective, project, renderWork, task } from './work-fixtures';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/hooks/useProductToday', () => ({ useProductToday: () => '2026-11-24' }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

const core: WorkObjective = { ...objective, id: 81, title: 'Core Workflow', status: 'ON_DOING', startDate: '2026-11-23', dueDate: '2026-12-07', nonCancelledTasks: 5, completedTasks: 2 };
const onboarding: WorkObjective = { ...objective, id: 82, title: 'Onboarding', status: 'BACKLOG', position: 1, startDate: null, dueDate: null, nonCancelledTasks: 0, completedTasks: 0, favorite: true };
const doing: WorkTask = { ...task, id: 43, objectiveId: 81, status: 'ON_DOING' };

const show = (layout: 'list' | 'gallery' | 'timeline', onLayoutChange = vi.fn(), objectives = [core, onboarding]) =>
  renderWork(<ProjectObjectives project={{ ...project, objectives }} tasks={[task, doing]} onAddTask={vi.fn()} onEditTask={vi.fn()} layout={layout} onLayoutChange={onLayoutChange} />);

beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.get).mockResolvedValue({ data: project }); vi.mocked(api.patch).mockResolvedValue({ data: {} }); });

it('troca a visão pelo seletor do cabeçalho', async () => {
  const onLayoutChange = vi.fn();
  show('list', onLayoutChange);
  const views = screen.getByRole('group', { name: 'Visão dos objetivos' });
  expect(within(views).getByRole('radio', { name: 'Lista' })).toHaveAttribute('aria-checked', 'true');
  await userEvent.click(within(views).getByRole('radio', { name: 'Galeria' }));
  expect(onLayoutChange).toHaveBeenCalledWith('gallery');
});

it('lista fixados primeiro, marcados, e fixa pelo menu', async () => {
  show('list');
  expect(screen.getAllByRole('button', { name: /Abrir objetivo/ }).map(item => item.getAttribute('aria-label')))
    .toEqual(['Abrir objetivo Onboarding, fixado', 'Abrir objetivo Core Workflow']);
  await userEvent.click(screen.getByRole('button', { name: 'Ações do objetivo Core Workflow' }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'Fixar' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/project/9/objectives/81', { version: 3, favorite: true }));
});

it('mostra cards com link para os itens de trabalho, progresso, pin e informações', async () => {
  show('gallery');
  const cards = within(screen.getByRole('list', { name: 'Galeria de objetivos' })).getAllByRole('listitem');
  expect(cards).toHaveLength(2);
  const card = within(cards[1]);
  expect(card.getByRole('link', { name: 'Core Workflow — ver itens de trabalho' })).toHaveAttribute('href', '/tasks/project/9?tab=board&objective=81');
  expect(card.getByText('2/5 tarefas')).toBeInTheDocument();
  expect(card.getByRole('img', { name: '2 concluídas, 1 em andamento e 2 restantes de 5 tarefas' })).toBeInTheDocument();
  expect(within(cards[0]).getByText('Nenhuma tarefa')).toBeInTheDocument();
  expect(within(cards[0]).getByRole('button', { name: 'Fixar Onboarding' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(card.getByRole('button', { name: 'Fixar Core Workflow' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/project/9/objectives/81', { version: 3, favorite: true }));
  await userEvent.click(card.getByRole('button', { name: 'Informações de Core Workflow' }));
  expect(screen.getByRole('dialog', { name: 'Core Workflow' })).toBeInTheDocument();
});

it('desenha a timeline com duração, barra e hoje, e abre o objetivo pela linha', async () => {
  show('timeline');
  const timeline = screen.getByRole('region', { name: 'Timeline dos objetivos' });
  expect(within(timeline).getByText('2 objetivos')).toBeInTheDocument();
  const rows = within(screen.getByRole('list', { name: 'Objetivos na timeline' })).getAllByRole('listitem');
  expect(within(rows[0]).getByRole('button', { name: 'Onboarding, Backlog, duração: —' })).toBeInTheDocument();
  expect(within(rows[1]).getByRole('button', { name: 'Core Workflow, Em andamento, duração: 15 dias' })).toBeInTheDocument();
  // Only the dated objective has a bar; it is a mouse shortcut, hidden from assistive technology.
  expect(rows[0].querySelectorAll('[aria-hidden="true"][tabindex="-1"]')).toHaveLength(0);
  expect(rows[1].querySelector('[aria-hidden="true"][tabindex="-1"]')).toHaveTextContent('Core Workflow');
  expect(timeline.querySelector('[data-timeline-today]')).not.toBeNull();
  expect(within(timeline).getByText('Hoje é 24 de novembro de 2026')).toBeInTheDocument();
  await userEvent.click(within(timeline).getByRole('radio', { name: 'Trimestre' }));
  expect(within(timeline).getByRole('radio', { name: 'Trimestre' })).toHaveAttribute('aria-checked', 'true');
  expect(within(timeline).getByText('4º trimestre 2026')).toBeInTheDocument();
  await userEvent.click(within(rows[1]).getByRole('button', { name: /Core Workflow/ }));
  expect(screen.getByRole('dialog', { name: 'Core Workflow' })).toBeInTheDocument();
});

it('centraliza hoje ao abrir e ao trocar a escala, mas não quando um objetivo é aberto', async () => {
  const scrollTo = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: scrollTo });
  try {
    show('timeline');
    const timeline = screen.getByRole('region', { name: 'Timeline dos objetivos' });
    expect(scrollTo).toHaveBeenCalledTimes(1);
    const row = within(screen.getByRole('list', { name: 'Objetivos na timeline' })).getAllByRole('listitem')[1];
    await userEvent.click(within(row).getByRole('button', { name: /Core Workflow/ }));
    expect(screen.getByRole('dialog', { name: 'Core Workflow' })).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    await userEvent.click(within(timeline).getByRole('radio', { name: 'Mês' }));
    expect(scrollTo).toHaveBeenCalledTimes(2);
  } finally {
    delete (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo;
  }
});
