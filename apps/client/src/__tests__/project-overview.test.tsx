import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import api from '@/services/api';
import type { WorkProject } from '@/types/work';
import { board, project, renderWork } from './work-fixtures';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/hooks/useHome', () => ({ useRecordVisit: vi.fn() }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));

const description = 'Publicar o portfólio e apresentar os serviços.\n\nEscopo\nTestar a página de contato em celulares.';
const overviewUrl = '/tasks/project/9?tab=overview';

function serve(readProject: () => WorkProject = () => project) {
  vi.mocked(api.get).mockImplementation(async url => ({ data: url === '/project/9/board' ? board : readProject() }));
}

function showProject(route = overviewUrl) {
  return renderWork(<Routes><Route path="/tasks/project/:id" element={<ProjectDetailPage />} /></Routes>, route);
}

beforeEach(() => {
  vi.resetAllMocks();
  serve();
});

it('mostra título, capa, texto com quebras de linha e os indicadores de progresso', async () => {
  const imageUrl = '/projects-pictures/portfolio.png';
  serve(() => ({ ...project, description, imageUrl, summary: { ...project.summary, overdueObjectiveCount: 2 } }));
  showProject();

  expect(await screen.findByRole('heading', { level: 1, name: project.title })).toBeVisible();
  expect(screen.getByRole('img', { name: `Capa de ${project.title}` })).toHaveAttribute('src', imageUrl);
  const section = screen.getByRole('region', { name: 'Descrição' });
  expect(within(section).getByRole('paragraph').textContent).toBe(description);
  expect(within(section).getByRole('button', { name: 'Editar descrição' })).toBeEnabled();
  const summary = screen.getByRole('complementary', { name: 'Informações do projeto' });
  expect(within(summary).getByRole('progressbar', { name: '0% dos objetivos concluídos' })).toBeInTheDocument();
  expect(within(summary).getByRole('progressbar', { name: '0% das tarefas concluídas' })).toBeInTheDocument();
  expect(within(summary).getByText('2 objetivos com prazo ultrapassado')).toBeVisible();
  expect(within(summary).getByRole('button', { name: 'Próximo mês' })).toBeEnabled();
});

it.each([null, '  \n  '])('oferece adicionar descrição e omite a capa ausente (%j)', async emptyDescription => {
  serve(() => ({ ...project, description: emptyDescription }));
  showProject();

  expect(await screen.findByRole('heading', { level: 1, name: project.title })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Adicionar descrição' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Editar descrição' })).not.toBeInTheDocument();
  expect(screen.queryByRole('img', { name: /^Capa de / })).not.toBeInTheDocument();
});

it('salva pelo editor do projeto, atualiza o Panorama e lê o valor ao reabrir a rota', async () => {
  let current = project;
  serve(() => current);
  vi.mocked(api.patch).mockImplementation(async (_url, body) => {
    current = { ...current, description: body.description, version: current.version + 1 };
    return { data: current };
  });
  const user = userEvent.setup();
  const mounted = showProject();
  await user.click(await screen.findByRole('button', { name: 'Adicionar descrição' }));

  const dialog = screen.getByRole('dialog', { name: 'Editar projeto' });
  const field = within(dialog).getByRole('textbox', { name: 'Descrição (opcional)' });
  expect(field).toHaveFocus();
  fireEvent.change(field, { target: { value: description } });
  await user.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

  const edit = await screen.findByRole('button', { name: 'Editar descrição' });
  expect(within(screen.getByRole('region', { name: 'Descrição' })).getByRole('paragraph').textContent).toBe(description);
  expect(api.patch).toHaveBeenCalledExactlyOnceWith('/project/9', {
    title: project.title, description, color: project.color, version: project.version,
  });
  expect(edit).toBeVisible();
  mounted.unmount();
  showProject();
  expect(await screen.findByRole('button', { name: 'Editar descrição' })).toBeVisible();
  expect(within(screen.getByRole('region', { name: 'Descrição' })).getByRole('paragraph').textContent).toBe(description);
});

it('permite recuperar a descrição após uma falha de carregamento', async () => {
  serve(() => ({ ...project, description }));
  vi.mocked(api.get).mockRejectedValueOnce({ isAxiosError: true, response: { status: 500, data: { message: 'Projeto indisponível.' } } });
  showProject();

  expect(screen.getByRole('status', { name: 'Carregando projeto' })).toBeInTheDocument();
  const feedback = await screen.findByRole('alert');
  expect(feedback).toHaveTextContent('Projeto indisponível.');
  await userEvent.click(within(feedback).getByRole('button', { name: 'Recarregar dados' }));
  expect(await screen.findByRole('button', { name: 'Editar descrição' })).toBeVisible();
});

it('mantém o resumo e a ação de conversão na rota do projeto simples', async () => {
  serve(() => ({ ...project, mode: 'SIMPLE', description }));
  showProject('/tasks/project/9');

  const summary = await screen.findByRole('complementary', { name: 'Informações do projeto' });
  expect(within(summary).getByRole('progressbar', { name: '0% dos objetivos concluídos' })).toBeVisible();
  expect(within(summary).getByRole('button', { name: 'Próximo mês' })).toBeEnabled();
  expect(within(summary).getByRole('button', { name: 'Usar quadro de tarefas' })).toBeEnabled();
  expect(screen.queryByRole('region', { name: 'Descrição' })).not.toBeInTheDocument();
});
