import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ProjectsPage from '@/pages/ProjectsPage';
import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionsProvider } from '@/components/common/HeaderActions';
import { SidebarProvider } from '@/components/ui/sidebar';
import api from '@/services/api';
import { project, renderWork, pageOf } from './work-fixtures';
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
beforeEach(() => {
  vi.mocked(api.get).mockImplementation(async url => ({ data: String(url).endsWith('deletion-preview') ? { projectVersion: 8, objectiveCount: 1, columnCount: 3, taskCount: 5 } : String(url).endsWith('summary') ? { activeProjects: 1, favoriteProjects: 0 } : pageOf([project]) }));
});
it('exclusão apresenta consequências, exige ciência e envia a versão do preview', async () => {
  vi.mocked(api.delete).mockResolvedValue({});
  renderWork(<ProjectsPage />);
  await userEvent.click(await screen.findByRole('button', { name: `Ações do projeto ${project.title}` }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'Excluir' }));
  expect(await screen.findByText(/As 5 tarefas serão preservadas/)).toBeInTheDocument();
  const remove = screen.getByRole('button', { name: 'Excluir projeto' });
  expect(remove).toBeDisabled();
  await userEvent.click(screen.getByRole('checkbox'));
  await userEvent.click(remove);
  await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/project/9', { headers: { 'If-Match': '"8"' } }));
});
it('conflito preserva a confirmação, exige novo preview e não exclui de novo sozinho', async () => {
  vi.mocked(api.delete).mockRejectedValue({ isAxiosError: true, response: { status: 409 } });
  renderWork(<ProjectsPage />);
  await userEvent.click(await screen.findByRole('button', { name: `Ações do projeto ${project.title}` }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'Excluir' }));
  await screen.findByText(/As 5 tarefas/);
  await userEvent.click(screen.getByRole('checkbox'));
  await userEvent.click(screen.getByRole('button', { name: 'Excluir projeto' }));
  expect(await screen.findByText(/Os dados mudaram/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Excluir projeto' })).toBeDisabled();
  expect(api.delete).toHaveBeenCalledTimes(1);
});
it('"Novo projeto" fica no header do app, ao lado do breadcrumb, e abre a criação', async () => {
  renderWork(<SidebarProvider><HeaderActionsProvider><AppHeader /><ProjectsPage /></HeaderActionsProvider></SidebarProvider>, '/projects');
  const create = within(screen.getByRole('banner')).getByRole('button', { name: 'Novo projeto' });
  await userEvent.click(create);
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
});
/** Serves the list the way the API filters it, by the query the page sends. */
function serveProjects(projects: typeof project[]) {
  vi.mocked(api.get).mockImplementation(async (url, config?: { params?: { favorite?: boolean; mode?: string } }) => {
    const params = config?.params ?? {};
    return { data: pageOf(projects.filter(p => (!params.favorite || p.favorite) && (!params.mode || p.mode === params.mode))) };
  });
}
const listQueries = () => vi.mocked(api.get).mock.calls.filter(([url]) => String(url) === `/project/user/${project.userId}`).map(([, config]) => (config as { params: object }).params);
function renderWithHeader(projects: typeof project[], width: number) {
  window.innerWidth = width;
  serveProjects(projects);
  return renderWork(<SidebarProvider><HeaderActionsProvider><AppHeader /><ProjectsPage /></HeaderActionsProvider></SidebarProvider>, '/projects');
}
const simple = { ...project, id: 11, title: 'Projeto simples', mode: 'SIMPLE' as const };
const defaultWidth = window.innerWidth;
afterEach(() => { window.innerWidth = defaultWidth; });

it('o filtro do header pede só fixados à API, marca o botão e leva aos arquivados', async () => {
  renderWithHeader([project, { ...project, id: 10, title: 'Projeto fixado', favorite: true }], 1280);
  await screen.findByRole('link', { name: project.title });
  await userEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Filtros' }));
  expect(screen.getByRole('link', { name: 'Ver arquivados' })).toHaveAttribute('href', '/all-data?tab=projects&archived=1');
  await userEvent.click(screen.getByRole('checkbox', { name: 'Somente fixados' }));
  await userEvent.keyboard('{Escape}');
  expect(await screen.findByRole('link', { name: 'Projeto fixado' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: project.title })).not.toBeInTheDocument();
  expect(listQueries().at(-1)).toEqual({ favorite: true, page: 0, size: 6 });
  expect(screen.getByRole('button', { name: 'Filtros (1 ativo)' })).toBeInTheDocument();
});

it('o filtro de tipo é feito pela API; os dois tipos marcados equivalem a nenhum', async () => {
  renderWithHeader([project, simple], 1280);
  await screen.findByRole('link', { name: project.title });
  await userEvent.click(screen.getByRole('button', { name: 'Filtros' }));
  await userEvent.click(await screen.findByRole('checkbox', { name: 'Simples' }));
  expect(screen.getByRole('checkbox', { name: 'Simples' })).toHaveAttribute('aria-checked', 'true');
  await waitFor(() => expect(listQueries().at(-1)).toEqual({ mode: 'SIMPLE', page: 0, size: 6 }));
  await userEvent.click(screen.getByRole('checkbox', { name: 'Desenvolvimento' }));
  await userEvent.keyboard('{Escape}');
  expect(await screen.findByRole('link', { name: project.title })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Projeto simples' })).toBeInTheDocument();
  expect(listQueries().at(-1)).toEqual({ page: 0, size: 6 });
  expect(screen.getByRole('button', { name: 'Filtros (2 ativos)' })).toBeInTheDocument();
});

it('em tela estreita os tipos ficam no painel de filtros', async () => {
  renderWithHeader([project, simple], 390);
  await screen.findByRole('link', { name: project.title });
  await userEvent.click(screen.getByRole('button', { name: 'Filtros' }));
  expect(screen.getByRole('dialog', { name: 'Filtros' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('checkbox', { name: 'Desenvolvimento' }));
  await waitFor(() => expect(listQueries().at(-1)).toEqual({ mode: 'DEVELOPMENT', page: 0, size: 6 }));
});
it('o breadcrumb nomeia a página: o título visível sai e o h1 fica só para leitores de tela', async () => {
  renderWithHeader([project], 1280);
  await screen.findByRole('link', { name: project.title });
  expect(screen.getByRole('heading', { level: 1, name: 'Projetos' })).toHaveClass('sr-only');
  expect(screen.queryByText(/na conta/)).not.toBeInTheDocument();
});
