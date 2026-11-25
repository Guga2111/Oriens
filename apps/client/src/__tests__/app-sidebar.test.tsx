import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { renderWork } from './work-fixtures';

const state = vi.hoisted(() => ({ role: 'USER', pending: false, error: null as Error | null, projects: [
  { id: 9, title: 'Site pessoal', mode: 'DEVELOPMENT', favorite: false },
  { id: 10, title: 'Lista simples', mode: 'SIMPLE', favorite: true },
], mutate: vi.fn(), refetch: vi.fn() }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ role: state.role }) }));
vi.mock('@/hooks/useWork', () => ({
  useWorkSidebar: () => ({ data: state.projects, isPending: state.pending, error: state.error, refetch: state.refetch }),
  useProjectFlags: () => ({ mutate: state.mutate, isPending: false, error: null }),
}));

function renderSidebar(path: string, onNewTask = vi.fn(), onNewProject = vi.fn()) {
  return renderWork(<SidebarProvider><AppSidebar onNewTask={onNewTask} onNewProject={onNewProject} /></SidebarProvider>, path);
}

describe('sidebar por contexto', () => {
  it('mostra Trabalho e abre o editor existente pela ação de criação', async () => {
    const create = vi.fn();
    renderSidebar('/tasks', create);
    const nav = screen.getByRole('navigation', { name: 'Menu de Trabalho' });
    expect(within(nav).getByRole('link', { name: 'Hoje' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Projetos' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Explorar' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Visão geral' })).not.toBeInTheDocument();
    expect(screen.queryByText('Administração')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Nova tarefa' }));
    expect(create).toHaveBeenCalledOnce();
  });

  it.each([
    ['/financial', 'Financeiro', ['Visão geral', 'Lançamentos', 'Investimentos']],
    ['/stats', 'Estatísticas', ['Visão geral']],
  ])('isola os itens de %s', (path, label, items) => {
    renderSidebar(path);
    const nav = screen.getByRole('navigation', { name: `Menu de ${label}` });
    expect(within(nav).getAllByRole('link').map(link => link.textContent)).toEqual(items);
    expect(within(nav).getByRole('link', { name: 'Visão geral' })).toHaveAttribute('href', path);
    expect(screen.queryByRole('button', { name: 'Nova tarefa' })).not.toBeInTheDocument();
    expect(screen.queryByText('Site pessoal')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Criar projeto' })).not.toBeInTheDocument();
  });

  it('marca Lançamentos, e não a Visão geral, em /financial/entries', () => {
    renderSidebar('/financial/entries');
    const nav = screen.getByRole('navigation', { name: 'Menu de Financeiro' });
    expect(within(nav).getByRole('link', { name: 'Lançamentos' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Visão geral' })).not.toHaveAttribute('aria-current');
  });

  it('aciona a criação de projeto sem alternar o grupo, mesmo recolhido', async () => {
    const create = vi.fn();
    renderSidebar('/tasks', vi.fn(), create);
    const group = screen.getByRole('button', { name: 'Projetos' });
    await userEvent.click(group);
    expect(group).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Criar projeto' }));
    expect(create).toHaveBeenCalledOnce();
    expect(group).toHaveAttribute('aria-expanded', 'false');
  });

  it('oculta Administração de usuários comuns e a exibe só em Configurações para ADMIN', () => {
    state.role = 'USER';
    const first = renderSidebar('/config');
    expect(screen.getByRole('link', { name: 'Ajuda & Suporte' })).toBeInTheDocument();
    expect(screen.queryByText('Administração')).not.toBeInTheDocument();
    first.unmount();
    state.role = 'ADMIN';
    const admin = renderSidebar('/admin/support');
    expect(screen.getByText('Administração')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard de Suporte' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Gerenciar Admins' })).toBeInTheDocument();
    admin.unmount();
    renderSidebar('/tasks');
    expect(screen.queryByText('Administração')).not.toBeInTheDocument();
    state.role = 'USER';
  });

  it.each([
    ['overview', 'Panorama'], ['board', 'Itens de trabalho'], ['timeline', 'Itens de trabalho'],
    ['list', 'Itens de trabalho'], ['objectives', 'Objetivos'],
  ])('com ?tab=%s marca só %s', (tab, current) => {
    renderSidebar(`/tasks/project/9?tab=${tab}`);
    const links = ['Panorama', 'Itens de trabalho', 'Objetivos'].map(name => screen.getByRole('link', { name }));
    expect(links.filter(link => link.getAttribute('aria-current') === 'page')).toHaveLength(1);
    expect(screen.getByRole('link', { name: current })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link', { name: 'Quadro' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Timeline' })).not.toBeInTheDocument();
  });

  it('"Itens de trabalho" agrupa quadro e timeline e mantém a visão em uso', () => {
    renderSidebar('/tasks/project/9?tab=timeline');
    expect(screen.getByRole('link', { name: 'Panorama' })).toHaveAttribute('href', '/tasks/project/9?tab=overview');
    expect(screen.getByRole('link', { name: 'Itens de trabalho' })).toHaveAttribute('href', '/tasks/project/9?tab=timeline');
    expect(screen.getByRole('link', { name: 'Objetivos' })).toHaveAttribute('href', '/tasks/project/9?tab=objectives');
  });

  it('de outra seção, "Itens de trabalho" abre no quadro', () => {
    renderSidebar('/tasks/project/9?tab=objectives');
    expect(screen.getByRole('link', { name: 'Itens de trabalho' })).toHaveAttribute('href', '/tasks/project/9?tab=board');
  });

  it('mantém fixação independente do seletor e grupo de projetos recolhível', async () => {
    renderSidebar('/tasks/project/9');
    expect(screen.queryByRole('link', { name: 'Site pessoal' })).not.toBeInTheDocument();
    const selector = screen.getByRole('button', { name: 'Site pessoal' });
    expect(selector).toHaveAttribute('aria-expanded', 'true');
    expect(selector).toHaveAttribute('data-active', 'false');
    expect(screen.getByRole('link', { name: 'Itens de trabalho' })).toHaveAttribute('aria-current', 'page');
    const pin = screen.getByRole('button', { name: 'Fixar Site pessoal' });
    expect(pin).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(pin);
    expect(state.mutate).toHaveBeenCalledWith({ project: state.projects[0], field: 'favorite', value: true });
    expect(selector).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Projetos' }));
    expect(screen.queryByRole('button', { name: 'Site pessoal' })).not.toBeInTheDocument();
  });

  it('expande o projeto sem navegar e acessa a página somente pelo subitem', async () => {
    renderSidebar('/tasks');
    const selector = screen.getByRole('button', { name: 'Site pessoal' });
    expect(selector).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Itens de trabalho' })).not.toBeInTheDocument();
    await userEvent.click(selector);
    expect(selector).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Hoje' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Itens de trabalho' })).not.toHaveAttribute('aria-current');
    await userEvent.click(screen.getByRole('link', { name: 'Objetivos' }));
    expect(screen.getByRole('link', { name: 'Objetivos' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(screen.getByRole('button', { name: 'Site pessoal' }));
    expect(screen.getByRole('button', { name: 'Site pessoal' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Objetivos' })).not.toBeInTheDocument();
  });

  it('abre e recolhe o seletor pelo teclado', async () => {
    renderSidebar('/tasks');
    const selector = screen.getByRole('button', { name: 'Site pessoal' });
    selector.focus();
    await userEvent.keyboard('{Enter}');
    expect(selector).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard(' ');
    expect(selector).toHaveAttribute('aria-expanded', 'false');
  });

  it('permite desafixar um projeto fixado', async () => {
    renderSidebar('/tasks');
    const unpin = screen.getByRole('button', { name: 'Desafixar Lista simples' });
    expect(unpin).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(unpin);
    expect(state.mutate).toHaveBeenCalledWith({ project: state.projects[1], field: 'favorite', value: false });
    expect(screen.getByRole('button', { name: 'Lista simples' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('não oferece abas de desenvolvimento para projeto simples', () => {
    renderSidebar('/tasks/project/10');
    expect(screen.queryByRole('link', { name: 'Itens de trabalho' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute('href', '/tasks/project/10');
    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute('aria-current', 'page');
  });

  it('trata carregamento, erro com recuperação e lista vazia', async () => {
    state.pending = true;
    const loading = renderSidebar('/tasks');
    expect(screen.getByRole('status')).toHaveTextContent('Carregando projetos');
    loading.unmount();
    state.pending = false;
    state.error = new Error('Falha de rede');
    const failed = renderSidebar('/tasks');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Recarregar dados' }));
    expect(state.refetch).toHaveBeenCalled();
    failed.unmount();
    state.error = null;
    const projects = state.projects;
    state.projects = [];
    renderSidebar('/tasks');
    expect(screen.getByText('Nenhum projeto recente.')).toBeInTheDocument();
    state.projects = projects;
  });
});
