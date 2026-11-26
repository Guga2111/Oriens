import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppHeader } from '@/components/common/AppHeader';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useWorkProject, workKey } from '@/hooks/useWork';
import api from '@/services/api';
import { board, project, renderWork } from './work-fixtures';

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
    expect(await within(breadcrumb).findByRole('link', { name: project.title })).toHaveAttribute('href', '/tasks/project/9?tab=overview');
    expect(within(breadcrumb).getByText('Objetivos').closest('[aria-current="page"]')).not.toBeNull();
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

  it('com a sidebar aberta mostra o ícone da página; fechada, oferece o botão para reabrir', () => {
    const width = window.innerWidth;
    window.innerWidth = 1280;
    try {
      const open = renderWork(<SidebarProvider><AppHeader /></SidebarProvider>, '/projects');
      expect(screen.queryByRole('button', { name: 'Alternar menu de navegação' })).not.toBeInTheDocument();
      expect(open.container.querySelector('[data-page-icon]')).toHaveClass('lucide-briefcase');
      open.unmount();

      const closed = renderWork(<SidebarProvider defaultOpen={false}><AppHeader /></SidebarProvider>, '/projects');
      expect(screen.getByRole('button', { name: 'Alternar menu de navegação' })).toHaveAttribute('aria-expanded', 'false');
      expect(closed.container.querySelector('[data-page-icon]')).toBeNull();
    } finally {
      window.innerWidth = width;
    }
  });

  it('na timeline mostra a seção e o total de itens do projeto', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { ...project, summary: { ...project.summary, totalTasks: 8 } } });
    renderHeader('/tasks/project/9?tab=timeline');
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect((await within(breadcrumb).findByText('Itens de trabalho')).closest('[aria-current="page"]')).not.toBeNull();
    expect(within(breadcrumb).getByLabelText('8 itens')).toHaveTextContent('8');
  });

  it('no quadro usa o total visível da consulta existente, inclusive quando não há resultados', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: project });
    const { client } = renderHeader('/tasks/project/9?tab=board&search=Publicar&priority=HIGH');
    const breadcrumb = within(screen.getByRole('navigation', { name: 'Breadcrumb' }));
    await breadcrumb.findByText('Itens de trabalho');
    const key = workKey(7, 'projects/board', 9, { search: 'Publicar', priority: 'HIGH' });

    act(() => {
      client.setQueryData(key, { ...board, filtered: true, total: { ...board.total, totalTasks: 2 } });
    });
    expect(await breadcrumb.findByLabelText('1 item')).toHaveTextContent('1');
    act(() => {
      client.setQueryData(key, { ...board, filtered: true, visible: { ...board.visible, totalTasks: 0 } });
    });
    expect(await breadcrumb.findByLabelText('0 itens')).toHaveTextContent('0');
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('projeto simples não ganha seção no breadcrumb', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { ...project, mode: 'SIMPLE' } });
    renderHeader('/tasks/project/9');
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(await within(breadcrumb).findByText(project.title)).toHaveAttribute('aria-current', 'page');
    expect(within(breadcrumb).queryByText('Itens de trabalho')).not.toBeInTheDocument();
  });
});
