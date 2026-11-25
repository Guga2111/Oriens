import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { AxiosError, type AxiosResponse } from 'axios';
import { toast } from 'sonner';
import { QuickLinks } from '@/components/home/QuickLinks';
import { RecentItems } from '@/components/home/RecentItems';
import { homeService } from '@/services/homeService';
import { validQuickLink } from '@/lib/home';
import { getAppContext, appContexts, isContextItemActive } from '@/components/layout/app-contexts';
import { taskAffectsKey, workKey } from '@/hooks/useWork';
import { useRecordVisit } from '@/hooks/useHome';
import { renderWork } from './work-fixtures';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7, username: 'Luís Gustavo' }) }));
vi.mock('@/services/homeService', () => ({ homeService: { links: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), recents: vi.fn(), visit: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const link = { id: 1, name: 'Documentação', url: 'https://example.test', createdAt: '2026-11-24T12:00:00Z', version: 2 };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(homeService.links).mockResolvedValue([link]);
  vi.mocked(homeService.recents).mockResolvedValue([]);
  vi.mocked(homeService.visit).mockResolvedValue();
});
it('Início fica acima de Hoje no contexto Trabalho e as rotas têm seleção independente', () => {
  expect(appContexts[0].items.map(item => item.label).slice(0, 2)).toEqual(['Início', 'Hoje']);
  expect(getAppContext('/home').id).toBe('work');
  expect(isContextItemActive(appContexts[0].items[0], '/home')).toBe(true);
  expect(isContextItemActive(appContexts[0].items[1], '/home')).toBe(false);
  expect(appContexts[0].items[1].url).toBe('/tasks');
});
it('aceita apenas rotas reconhecidas e HTTPS sem credenciais', () => {
  for (const url of ['/home', '/tasks?task=42', '/tasks/project/9?tab=board', 'https://example.test/path?q=1']) expect(validQuickLink(url)).toBe(true);
  for (const url of ['//example.test', 'javascript:alert(1)', 'http://example.test', 'https://me:pass@example.test', '/unknown', '/home/../auth', '/%2fexample.test', '/home\\evil', 'https://example.test bad']) expect(validQuickLink(url)).toBe(false);
});
it('cria um link e o mostra após refetch; externos abrem outra aba com proteção', async () => {
  const user = userEvent.setup();
  renderWork(<QuickLinks />, '/home');
  const external = await screen.findByRole('link', { name: /Documentação/ });
  expect(external).toHaveAttribute('target', '_blank');
  expect(external).toHaveAttribute('rel', 'noopener noreferrer');
  await user.click(screen.getByRole('button', { name: /^Adicionar link$/ }));
  await user.type(screen.getByRole('textbox', { name: 'Nome' }), 'Projetos');
  await user.type(screen.getByRole('textbox', { name: 'Endereço' }), '/projects');
  vi.mocked(homeService.links).mockResolvedValue([link, { ...link, id: 2, name: 'Projetos', url: '/projects' }]);
  vi.mocked(homeService.create).mockResolvedValue({ ...link, id: 2, name: 'Projetos', url: '/projects' });
  await user.click(screen.getByRole('button', { name: 'Salvar link' }));
  expect(homeService.create).toHaveBeenCalledWith({ name: 'Projetos', url: '/projects' }, expect.any(String));
  expect(await screen.findByRole('link', { name: 'Projetos' })).toHaveAttribute('href', '/projects');
});
it('mantém campos e usa a mesma chave ao repetir uma criação de resultado incerto', async () => {
  const user = userEvent.setup();
  vi.mocked(homeService.create).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(link);
  renderWork(<QuickLinks />);
  await user.click(await screen.findByRole('button', { name: /^Adicionar link$/ }));
  await user.type(screen.getByRole('textbox', { name: 'Nome' }), 'Site');
  await user.type(screen.getByRole('textbox', { name: 'Endereço' }), 'https://example.test');
  await user.click(screen.getByRole('button', { name: 'Salvar link' }));
  expect(await screen.findByRole('button', { name: 'Repetir tentativa' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Nome' })).toHaveValue('Site');
  await user.click(screen.getByRole('button', { name: 'Repetir tentativa' }));
  await waitFor(() => expect(homeService.create).toHaveBeenCalledTimes(2));
  expect(vi.mocked(homeService.create).mock.calls[1]).toEqual(vi.mocked(homeService.create).mock.calls[0]);
});
it('edita com a versão lida e confirma a remoção', async () => {
  const user = userEvent.setup();
  renderWork(<QuickLinks />);
  await user.click(await screen.findByRole('button', { name: 'Opções de Documentação' }));
  await user.click(screen.getByRole('menuitem', { name: 'Editar' }));
  await user.clear(screen.getByRole('textbox', { name: 'Nome' }));
  await user.type(screen.getByRole('textbox', { name: 'Nome' }), 'Docs');
  vi.mocked(homeService.update).mockResolvedValue({ ...link, name: 'Docs', version: 3 });
  await user.click(screen.getByRole('button', { name: 'Salvar link' }));
  await waitFor(() => expect(homeService.update).toHaveBeenCalledWith(link, { name: 'Docs', url: link.url }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await user.click(screen.getByRole('button', { name: 'Opções de Documentação' }));
  await user.click(screen.getByRole('menuitem', { name: 'Remover' }));
  expect(homeService.remove).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: /^Remover link$/ }));
  await waitFor(() => expect(homeService.remove).toHaveBeenCalledWith(link));
});
it('valida o endereço sem enviar o formulário inválido', async () => {
  const user = userEvent.setup();
  renderWork(<QuickLinks />);
  await user.click(await screen.findByRole('button', { name: /^Adicionar link$/ }));
  await user.type(screen.getByRole('textbox', { name: 'Nome' }), 'Inválido');
  await user.type(screen.getByRole('textbox', { name: 'Endereço' }), 'javascript:alert(1)');
  await user.click(screen.getByRole('button', { name: 'Salvar link' }));
  expect(screen.getByRole('textbox', { name: 'Endereço' })).toHaveAttribute('aria-invalid', 'true');
  expect(homeService.create).not.toHaveBeenCalled();
});
it('mostra recentes reais e abre tarefas pelo painel existente', async () => {
  const open = vi.fn();
  vi.mocked(homeService.recents).mockResolvedValue([
    { type: 'TASK', resourceId: 42, title: 'Montar formulário', visitedAt: '2026-11-24T12:00:00Z' },
    { type: 'PROJECT', resourceId: 9, title: 'Site pessoal', visitedAt: '2026-11-24T11:00:00Z' },
  ]);
  renderWork(<RecentItems onOpenTask={open} />);
  fireEvent.click(await screen.findByRole('button', { name: /Montar formulário/ }));
  expect(open).toHaveBeenCalledWith(42);
  expect(screen.getByRole('link', { name: /Site pessoal/ })).toHaveAttribute('href', '/tasks/project/9');
});
it('mostra vazio e permite repetir a consulta depois de uma falha', async () => {
  vi.mocked(homeService.recents).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
  renderWork(<RecentItems onOpenTask={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByText('Retome de onde parou')).toBeInTheDocument();
});
it('registra uma abertura uma vez sem bloquear a tela quando o registro falha', async () => {
  vi.mocked(homeService.visit).mockRejectedValue(new Error('offline'));
  function Harness() { useRecordVisit('TASK', 42); return <p>Tarefa aberta</p>; }
  const { rerender } = renderWork(<Harness />);
  expect(screen.getByText('Tarefa aberta')).toBeInTheDocument();
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Você pode continuar trabalhando')));
  expect(homeService.visit).toHaveBeenCalledTimes(1);
});
it('não avisa erro ao abrir item de projeto arquivado, que fica fora dos recentes', async () => {
  vi.mocked(homeService.visit).mockRejectedValue(new AxiosError('Not found', '404', undefined, undefined, { status: 404 } as AxiosResponse));
  function Harness() { useRecordVisit('PROJECT', 9); return <p>Projeto arquivado</p>; }
  renderWork(<Harness />);
  await waitFor(() => expect(homeService.visit).toHaveBeenCalledTimes(1));
  await act(async () => { await Promise.resolve(); });
  expect(toast.error).not.toHaveBeenCalled();
});

it('edições e exclusões de tarefa atualizam somente os recentes da mesma conta', () => {
  const result = { id: 42, previousPlannedDate: null, affectedProjectIds: [] };
  expect(taskAffectsKey(workKey(7, 'home', 'recents'), 7, result, '2026-11-24')).toBe(true);
  expect(taskAffectsKey(workKey(8, 'home', 'recents'), 7, result, '2026-11-24')).toBe(false);
  expect(taskAffectsKey(workKey(7, 'home', 'links'), 7, result, '2026-11-24')).toBe(false);
});
