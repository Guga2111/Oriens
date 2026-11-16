import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppHeader } from '@/components/common/AppHeader';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useWorkProject, workKey } from '@/hooks/useWork';
import api from '@/services/api';
import { project, renderWork } from './work-fixtures';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn() } }));
vi.mock('@/components/dashboard/NotificationBell', () => ({ NotificationBell: () => <button>Notificações</button> }));

function ProjectConsumer() {
  const { data } = useWorkProject(9);
  return <h1>{data?.title}</h1>;
}

function renderHeader(route: string, withProject = false) {
  return renderWork(<SidebarProvider><AppHeader />{withProject && <ProjectConsumer />}</SidebarProvider>, route);
}

describe('AppHeader — navegação de contexto', () => {
  it('identifica a seção sem buscar um projeto nem criar outro h1', () => {
    renderHeader('/stats/');
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Estatísticas')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('compartilha a consulta da página, acompanha renomeação e volta à seção Projetos', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: project });
    const { client } = renderHeader('/tasks/project/9?tab=objectives', true);
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(await within(breadcrumb).findByText(project.title)).toHaveAttribute('aria-current', 'page');
    expect(api.get).toHaveBeenCalledTimes(1);
    act(() => { client.setQueryData(workKey(7, 'projects/detail', 9), { ...project, title: 'Novo nome do projeto' }); });
    await waitFor(() => expect(within(breadcrumb).getByText('Novo nome do projeto')).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Novo nome do projeto');
    await userEvent.click(within(breadcrumb).getByRole('link', { name: 'Projetos' }));
    expect(within(breadcrumb).getByText('Projetos')).toHaveAttribute('aria-current', 'page');
    expect(within(breadcrumb).queryByText('Novo nome do projeto')).not.toBeInTheDocument();
  });

  it.each(['invalid', '0', '-1', '9007199254740992'])('não consulta o ID inválido %s e mantém a saída para Projetos', id => {
    renderHeader(`/tasks/project/${id}`);
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByText('Projeto indisponível')).toBeInTheDocument();
    expect(within(breadcrumb).getByRole('link', { name: 'Projetos' })).toHaveAttribute('href', '/projects');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('mostra carregamento e indisponibilidade sem expor outro projeto do cache', async () => {
    let fail!: (reason: Error) => void;
    vi.mocked(api.get).mockImplementation(() => new Promise((_, reject) => { fail = reject; }));
    const { client } = renderHeader('/tasks/project/10');
    act(() => { client.setQueryData(workKey(7, 'projects/detail', 9), project); });
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByText('Carregando projeto…')).toBeInTheDocument();
    expect(within(breadcrumb).queryByText(project.title)).not.toBeInTheDocument();
    await act(async () => { fail(new Error('Projeto não encontrado')); });
    expect(await within(breadcrumb).findByText('Projeto indisponível')).toBeInTheDocument();
  });
});
