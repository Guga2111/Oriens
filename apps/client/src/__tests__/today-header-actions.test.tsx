import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { TodayHeaderActions } from '@/components/dashboard/TodayHeaderActions';
import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionsProvider } from '@/components/common/HeaderActions';
import { SidebarProvider } from '@/components/ui/sidebar';
import { renderWork } from './work-fixtures';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function renderActions() {
  return renderWork(<SidebarProvider><HeaderActionsProvider><AppHeader /><TodayHeaderActions search="" onSearchChange={vi.fn()} /></HeaderActionsProvider></SidebarProvider>, '/tasks?date=2026-11-24&view=week#planning');
}

it('mantém Hoje no breadcrumb e abre a sheet vazia pelo header; Escape fecha e devolve o foco', async () => {
  const { container } = renderActions();
  const header = within(screen.getByRole('banner'));
  expect(header.getByText('Hoje')).toHaveAttribute('aria-current', 'page');
  expect(container.querySelector('[data-page-icon]')).toHaveClass('lucide-calendar-check');
  await userEvent.click(header.getByRole('button', { name: 'Análises' }));
  const sheet = screen.getByRole('dialog', { name: 'Análises de Hoje' });
  expect(sheet).toHaveTextContent('Análises de Hoje');
  expect(within(sheet).getAllByRole('button')).toHaveLength(1);
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(header.getByRole('button', { name: 'Análises' })).toHaveFocus();
});

it('oferece nova aba e copia o link completo da rota atual', async () => {
  const user = userEvent.setup();
  const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  renderActions();
  await user.click(screen.getByRole('button', { name: 'Mais opções de Hoje' }));
  const link = screen.getByRole('menuitem', { name: 'Abrir em nova aba' });
  expect(link).toHaveAttribute('href', '/tasks?date=2026-11-24&view=week#planning');
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await user.click(screen.getByRole('menuitem', { name: 'Copiar link' }));
  expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/tasks?date=2026-11-24&view=week#planning`);
  expect(toast.success).toHaveBeenCalledWith('Link copiado.');
});

it('informa quando a área de transferência falha', async () => {
  const user = userEvent.setup();
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
  renderActions();
  await user.click(screen.getByRole('button', { name: 'Mais opções de Hoje' }));
  await user.click(screen.getByRole('menuitem', { name: 'Copiar link' }));
  expect(toast.error).toHaveBeenCalledWith('Não foi possível copiar o link. Copie o endereço pela barra do navegador.');
});


it('expande a busca no cabeçalho sem diálogo e recolhe com Escape ou ao sair do campo vazio', async () => {
  renderActions();
  const header = within(screen.getByRole('banner'));
  await userEvent.click(header.getByRole('button', { name: 'Buscar tarefas' }));
  const input = header.getByRole('searchbox', { name: 'Buscar nas tarefas carregadas' });
  expect(input).toHaveFocus();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await userEvent.keyboard('{Escape}');
  expect(header.queryByRole('searchbox')).not.toBeInTheDocument();
  await vi.waitFor(() => expect(header.getByRole('button', { name: 'Buscar tarefas' })).toHaveFocus());
  await userEvent.click(header.getByRole('button', { name: 'Buscar tarefas' }));
  await userEvent.tab();
  expect(header.queryByRole('searchbox')).not.toBeInTheDocument();
  expect(header.getByRole('button', { name: 'Análises' })).toHaveFocus();
});
