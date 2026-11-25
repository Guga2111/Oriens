import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { DashboardPage } from '@/pages/DashboardPage';
import api from '@/services/api';
import { productNow } from '@/lib/product-time';
import type { DayResponse, TaskPatch } from '@/types/work';
import { board, renderWork, task } from './work-fixtures';
import { useLocation } from 'react-router-dom';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/hooks/useSound', () => ({ useSound: () => vi.fn() }));
// The task view is a user preference; this fake keeps it like the settings context would.
const settings = vi.hoisted(() => ({ taskView: 'peek' as string, update: [] as unknown[][] }));
vi.mock('@/context/SettingsContext', () => ({
  useSettings: () => ({
    preferences: { notifications: true, sound: false, theme: 'light', taskView: settings.taskView },
    updatePreference: async (key: string, value: string) => { settings.update.push([key, value]); settings.taskView = value; },
  }),
}));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));

const catalog = [{ id: 1, name: 'Frontend', color: 'RED' }, { id: 2, name: 'Pesquisa', color: 'BLUE' }];
let current = task;

beforeEach(() => {
  vi.clearAllMocks();
  settings.taskView = 'peek'; settings.update = [];
  const today = productNow().date;
  current = { ...task, plannedDate: today, startTime: null, dueDate: '2099-01-10', labels: [catalog[0]] } as typeof task;
  vi.mocked(api.get).mockImplementation(async (url: string, config?: { params?: { date?: string } }) => {
    if (url.startsWith('/task-labels/')) return { data: catalog };
    if (url === `/task/${task.id}`) return { data: current };
    if (url === '/project/9/board') return { data: board };
    const day: DayResponse = { date: config?.params?.date ?? today, timezone: 'America/Recife', planned: [current], completed: [], previousPlans: [], deadlineAttention: [] };
    return { data: day };
  });
  vi.mocked(api.patch).mockImplementation(async (_url, body) => {
    current = { ...current, ...(body as TaskPatch), version: current.version + 1 };
    return { data: { task: current, previousPlannedDate: current.plannedDate, plannedDate: current.plannedDate, affectedProjectIds: [9] } };
  });
});

const row = async () => (await screen.findByText(task.title)).closest('li')!;
const versions = { version: 2, projectVersion: 4 };

it('troca a prioridade pelo popover do chip', async () => {
  renderWork(<DashboardPage />);
  await userEvent.click(within(await row()).getByRole('button', { name: 'Prioridade média' }));
  await userEvent.click(await screen.findByRole('option', { name: 'Alta' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/task/42', { priority: 'HIGH', ...versions }));
});

it('oferece urgente e sem prioridade, do mais urgente ao sem prioridade', async () => {
  renderWork(<DashboardPage />);
  await userEvent.click(within(await row()).getByRole('button', { name: 'Prioridade média' }));
  const options = await screen.findAllByRole('option');
  expect(options.map(option => option.textContent?.replace('(atual)', '').trim()))
    .toEqual(['Urgente', 'Alta', 'Média', 'Baixa', 'Sem prioridade']);
  await userEvent.click(screen.getByRole('option', { name: 'Urgente' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/task/42', { priority: 'URGENT', ...versions }));
  await userEvent.click(within(await row()).getByRole('button', { name: 'Prioridade urgente' }));
  await userEvent.click(await screen.findByRole('option', { name: 'Sem prioridade' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/task/42', { priority: 'NONE', version: 3, projectVersion: 4 }));
  expect(await within(await row()).findByRole('button', { name: 'Sem prioridade' })).toBeInTheDocument();
});

it('marca uma etiqueta do catálogo e envia a lista completa', async () => {
  renderWork(<DashboardPage />);
  await userEvent.click(within(await row()).getByRole('button', { name: /Etiquetas:/ }));
  await userEvent.click(await screen.findByRole('option', { name: /Pesquisa/ }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/task/42', { labelIds: [1, 2], ...versions }));
});

it('remove o prazo pelo calendário do chip', async () => {
  renderWork(<DashboardPage />);
  await userEvent.click(within(await row()).getByRole('button', { name: 'Prazo: 10/01/2099' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Remover prazo' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/task/42', { dueDate: null, ...versions }));
});

it('lê o horário digitado livremente, recusa o que não entende e salva com segundos', async () => {
  renderWork(<DashboardPage />);
  await userEvent.click(within(await row()).getByRole('button', { name: 'Definir horário' }));
  const input = await screen.findByRole('combobox', { name: 'Horário' });
  await userEvent.type(input, '9:3{Enter}');
  expect(await screen.findByText('Não reconheci. Tente 9h30 ou 14:00.')).toBeInTheDocument();
  expect(api.patch).not.toHaveBeenCalled();
  await userEvent.clear(input);
  await userEvent.type(input, '9h15');
  expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual(['09:15']);
  await userEvent.keyboard('{Enter}');
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/task/42', { startTime: '09:15:00', ...versions }));
});

it('escolhe uma meia hora da lista, marca o horário atual e remove o horário', async () => {
  renderWork(<DashboardPage />);
  await userEvent.click(within(await row()).getByRole('button', { name: 'Definir horário' }));
  expect(await screen.findAllByRole('option')).toHaveLength(48);
  expect(screen.queryByRole('button', { name: 'Remover horário' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('option', { name: '14:30' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/task/42', { startTime: '14:30:00', ...versions }));

  await userEvent.click(await within(await row()).findByRole('button', { name: 'Horário 14:30' }));
  expect(await screen.findByRole('option', { name: /^14:30\s*\(atual\)$/ })).toHaveAttribute('aria-selected', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Remover horário' }));
  await waitFor(() => expect(api.patch).toHaveBeenLastCalledWith('/task/42', { startTime: null, version: 3, projectVersion: 4 }));
});

it('nomeia o chip vazio em um tooltip ao receber foco', async () => {
  current = { ...current, dueDate: null };
  renderWork(<DashboardPage />);
  const empty = within(await row()).getByRole('button', { name: 'Definir prazo' });
  empty.focus();
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Definir prazo');
});

function Url() { return <output aria-label="url">{useLocation().search}</output>; }

it('abre o painel da tarefa pelo título, edita nele e fecha limpando a URL', async () => {
  renderWork(<><DashboardPage /><Url /></>);
  await userEvent.click(within(await row()).getByRole('button', { name: task.title }));
  const panel = await screen.findByRole('dialog', { name: task.title });
  expect(screen.getByLabelText('url')).toHaveTextContent('task=42');
  expect(within(panel).getByText('Site pessoal · #42')).toBeInTheDocument();
  expect(within(panel).getByText('Descrição original')).toBeInTheDocument();
  expect(within(panel).getByRole('link', { name: 'Receber contatos pelo site' })).toBeInTheDocument();

  await userEvent.click(within(panel).getByRole('button', { name: 'Prioridade média' }));
  await userEvent.click(await screen.findByRole('option', { name: 'Baixa' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/task/42', { priority: 'LOW', ...versions }));

  await userEvent.click(within(panel).getByRole('button', { name: 'Fechar painel' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: task.title })).not.toBeInTheDocument());
  expect(screen.getByLabelText('url')).not.toHaveTextContent('task=');
});

it('fecha o painel ao clicar fora dele', async () => {
  renderWork(<><DashboardPage /><Url /></>);
  await userEvent.click(within(await row()).getByRole('button', { name: task.title }));
  await screen.findByRole('dialog', { name: task.title });
  await userEvent.click(screen.getByRole('heading', { level: 1 }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: task.title })).not.toBeInTheDocument());
  expect(screen.getByLabelText('url')).not.toHaveTextContent('task=');
});

it('escolhe hora e minuto nas colunas do relógio e salva uma vez', async () => {
  renderWork(<DashboardPage />);
  await userEvent.click(within(await row()).getByRole('button', { name: 'Definir horário' }));
  await userEvent.type(await screen.findByRole('combobox', { name: 'Horário' }), '9h15');
  await userEvent.click(screen.getByRole('button', { name: 'Escolher hora e minuto' }));
  const picker = await screen.findByRole('dialog', { name: 'Hora e minuto' });
  const hours = within(within(picker).getByRole('group', { name: 'Hora' }));
  const minutes = within(within(picker).getByRole('group', { name: 'Minuto' }));
  expect(hours.getByRole('radio', { name: '09' })).toHaveAttribute('aria-checked', 'true');
  expect(minutes.getByRole('radio', { name: '15' })).toHaveAttribute('aria-checked', 'true');

  await userEvent.click(hours.getByRole('radio', { name: '16' }));
  await userEvent.click(minutes.getByRole('radio', { name: '45' }));
  expect(api.patch).not.toHaveBeenCalled();
  await userEvent.click(within(picker).getByRole('button', { name: 'Definir 16:45' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/task/42', { startTime: '16:45:00', ...versions }));
  expect(api.patch).toHaveBeenCalledTimes(1);
});

const openPanel = async () => {
  await userEvent.click(within(await row()).getByRole('button', { name: task.title }));
  return screen.findByRole('dialog', { name: task.title });
};

it('edita o título no próprio painel: Enter salva, Esc desfaz sem fechar e vazio é recusado', async () => {
  renderWork(<DashboardPage />);
  const panel = await openPanel();
  const title = within(panel).getByRole('textbox', { name: 'Título da tarefa' });

  await userEvent.clear(title);
  await userEvent.type(title, 'Rascunho descartado');
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(title).toHaveValue(task.title));
  expect(screen.getByRole('dialog', { name: task.title })).toBeInTheDocument();

  await userEvent.clear(title);
  await userEvent.tab();
  expect(await within(panel).findByRole('alert')).toHaveTextContent('Informe o título da tarefa.');
  expect(title).toHaveValue(task.title);
  expect(api.patch).not.toHaveBeenCalled();

  await userEvent.clear(title);
  await userEvent.type(title, '  Formulário de contato {Enter}');
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/task/42', { title: 'Formulário de contato', ...versions }));
});

it('edita a descrição livremente, com quebras de linha, e salva ao sair do campo', async () => {
  renderWork(<DashboardPage />);
  const panel = await openPanel();
  const description = within(panel).getByRole('textbox', { name: 'Descrição' });
  await userEvent.clear(description);
  await userEvent.type(description, 'Primeira linha{Enter}Segunda linha');
  expect(api.patch).not.toHaveBeenCalled();
  await userEvent.click(within(panel).getByRole('heading', { name: 'Propriedades' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/task/42', { description: 'Primeira linha\nSegunda linha', ...versions }));
});

it('apagar a descrição envia null', async () => {
  renderWork(<DashboardPage />);
  const panel = await openPanel();
  await userEvent.clear(within(panel).getByRole('textbox', { name: 'Descrição' }));
  await userEvent.click(within(panel).getByRole('heading', { name: 'Propriedades' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/task/42', { description: null, ...versions }));
});

it('move a tarefa de coluna pelo painel', async () => {
  renderWork(<DashboardPage />);
  const panel = await openPanel();
  await userEvent.click(within(panel).getByRole('button', { name: 'Coluna: A fazer' }));
  expect(await screen.findByRole('option', { name: /A fazer\s*\(atual\)/ })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('option', { name: 'Fazendo' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/task/42', { columnId: 12, beforeTaskId: null, ...versions }));
});

it('troca o modo de visualização para modal e guarda a escolha nas preferências', async () => {
  const first = renderWork(<DashboardPage />);
  const panel = await openPanel();
  const trigger = within(panel).getByRole('button', { name: 'Modo de visualização: Painel lateral' });
  trigger.focus();
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Modo de visualização');
  await userEvent.click(trigger);
  await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Modal' }));
  expect(settings.update).toEqual([['taskView', 'modal']]);
  first.unmount();

  // The next task opens as the preference says.
  renderWork(<DashboardPage />);
  const reopened = await openPanel();
  expect(within(reopened).getByRole('button', { name: 'Modo de visualização: Modal' })).toBeInTheDocument();
});
