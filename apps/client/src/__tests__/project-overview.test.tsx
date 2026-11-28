import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import api from '@/services/api';
import { descriptionFromText } from '@/components/tasks/description/descriptionContent';
import type { BoardResponse, WorkProject, TaskDescriptionDocument, ProjectActivityPage } from '@/types/work';
import { board, objective, project, renderWork } from './work-fixtures';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/hooks/useHome', () => ({ useRecordVisit: vi.fn() }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('@/components/tasks/description/TaskDescriptionEditor', async () => {
  const { descriptionFromText } = await import('@/components/tasks/description/descriptionContent');
  return {
    TaskDescriptionEditor: ({ document, editable, autoFocus, onChange }: {
      document: TaskDescriptionDocument;
      editable: boolean;
      autoFocus: boolean;
      onChange: (value: TaskDescriptionDocument) => void;
    }) => {
      const text = document.content.content?.[0]?.content?.map(node => node.type === 'hardBreak' ? '\n' : node.text).join('') ?? '';
      return editable
        ? <textarea aria-label="Descrição" autoFocus={autoFocus} value={text} onChange={event => onChange(descriptionFromText(event.target.value))} />
        : <p>{text}</p>;
    },
  };
});

const description = 'Publicar o portfólio e apresentar os serviços.\n\nEscopo\nTestar a página de contato em celulares.';
const overviewUrl = '/tasks/project/9?tab=overview';

function serve(readProject: () => WorkProject = () => project, readActivity: (page: number) => ProjectActivityPage = page => ({
  page, actor: 'Conta de teste', hasNext: false, items: [],
}), readBoard: () => BoardResponse | Promise<BoardResponse> = () => board) {
  vi.mocked(api.get).mockImplementation(async (url, config) => {
    if (url === '/project/9/activity') return { data: readActivity(config.params.page) };
    return { data: url === '/project/9/board' ? await readBoard() : readProject() };
  });
}

function showProject(route = overviewUrl) {
  return renderWork(<Routes><Route path="/tasks/project/:id" element={<ProjectDetailPage />} /></Routes>, route);
}

beforeEach(() => {
  vi.resetAllMocks();
  serve();
});

it('mostra título, capa, texto com quebras de linha e a distribuição por estágio', async () => {
  const imageUrl = '/projects-pictures/portfolio.png';
  serve(() => ({
    ...project, description, imageUrl, summary: { ...project.summary, overdueObjectiveCount: 2 },
    objectives: [objective, { ...objective, id: 82, status: 'ON_DOING' }, { ...objective, id: 83, status: 'ON_DOING' }],
  }), undefined, () => ({
    ...board,
    columns: [board.columns[0], { ...board.columns[1], name: 'Em revisão', totalCount: 2, visibleCount: 0 }, board.columns[2]],
    total: { ...board.total, totalTasks: 4 },
  }));
  showProject(overviewUrl + '&search=um filtro antigo');

  expect(await screen.findByRole('heading', { level: 1, name: project.title })).toBeVisible();
  expect(screen.getByRole('img', { name: `Capa de ${project.title}` })).toHaveAttribute('src', imageUrl);
  expect(screen.getByRole('button', { name: 'Trocar capa' })).toBeEnabled();
  const section = screen.getByRole('region', { name: 'Descrição' });
  expect(within(section).getByRole('paragraph').textContent).toBe(description);
  expect(within(section).getByRole('button', { name: 'Editar descrição' })).toBeEnabled();
  const summary = screen.getByRole('complementary', { name: 'Informações do projeto' });
  const objectives = within(summary).getByRole('region', { name: 'Objetivos por estágio' });
  expect(within(objectives).getAllByRole('listitem').map(item => item.textContent)).toEqual([
    'Backlog0', 'Planejado1', 'Em andamento2', 'Pausado0', 'Concluído0', 'Cancelado0',
  ]);
  const tasks = within(await within(summary).findByRole('region', { name: 'Tarefas por coluna' }));
  expect((await tasks.findAllByRole('listitem')).map(item => item.textContent)).toEqual([
    'A fazer1', 'Em revisão2', 'Concluídas0', 'Sem coluna1',
  ]);
  expect(tasks.getByText('4', { exact: true })).toBeVisible();
  expect(api.get).toHaveBeenCalledWith('/project/9/board', expect.objectContaining({ params: {} }));
  expect(within(summary).getByText('2 objetivos com prazo ultrapassado')).toBeVisible();
  expect(within(summary).queryByRole('heading', { name: 'Calendário' })).not.toBeInTheDocument();
});

it('carrega os estágios de tarefas, permite tentar de novo e mostra o projeto vazio', async () => {
  let failBoard = true;
  let rejectBoard: (reason: unknown) => void;
  const firstBoard = new Promise<BoardResponse>((_, reject) => { rejectBoard = reject; });
  serve(() => ({ ...project, objectives: [] }), undefined, () => {
    if (failBoard) {
      failBoard = false;
      return firstBoard;
    }
    return { ...board, columns: [], total: { totalTasks: 0, nonCancelledTasks: 0, completedTasks: 0, cancelledTasks: 0 } };
  });
  showProject();
  expect(await screen.findByText('Nenhum objetivo definido.')).toBeVisible();
  const tasks = within(screen.getByRole('region', { name: 'Tarefas por coluna' }));
  expect(tasks.getByRole('status', { name: 'Carregando distribuição de tarefas' })).toBeVisible();
  rejectBoard!({ isAxiosError: true, response: { status: 500, data: { message: 'Quadro indisponível.' } } });
  const feedback = await tasks.findByRole('alert');
  expect(feedback).toHaveTextContent('Quadro indisponível.');
  await userEvent.click(within(feedback).getByRole('button', { name: 'Recarregar dados' }));
  expect(await tasks.findByText('Nenhuma tarefa no projeto.')).toBeVisible();
});

it.each([
  { archived: false, color: null, favorite: false, state: 'Ativo', colorLabel: 'Sem cor', favoriteLabel: 'Não' },
  { archived: true, color: '#d95721', favorite: true, state: 'Arquivado', colorLabel: '#D95721', favoriteLabel: 'Sim' },
])('mostra as propriedades do projeto de desenvolvimento ($state)', async ({ archived, color, favorite, state, colorLabel, favoriteLabel }) => {
  serve(() => ({ ...project, archived, color, favorite }));
  showProject();

  const properties = within(await screen.findByRole('region', { name: 'Propriedades' }));
  expect(properties.getAllByRole('term').map(term => term.textContent)).toEqual(['Situação', 'Tipo', 'Cor', 'Fixado']);
  expect(properties.getAllByRole('definition').map(definition => definition.textContent)).toEqual([state, 'Desenvolvimento', colorLabel, favoriteLabel]);
});

it('altera situação e fixação pelos menus nas propriedades', async () => {
  let current = project;
  serve(() => current);
  vi.mocked(api.patch).mockImplementation(async (_url, body) => {
    current = { ...current, ...body, version: current.version + 1 };
    return { data: current };
  });
  const user = userEvent.setup();
  showProject();
  const properties = within(await screen.findByRole('region', { name: 'Propriedades' }));

  const status = properties.getByRole('button', { name: 'Situação: Ativo' });
  status.focus();
  await user.keyboard('{Enter}');
  expect(await screen.findByRole('menuitemradio', { name: 'Ativo' })).toHaveAttribute('aria-checked', 'true');
  await user.keyboard('{Escape}');
  expect(status).toHaveFocus();
  await user.keyboard('{Enter}');
  await user.click(await screen.findByRole('menuitemradio', { name: 'Arquivado' }));
  expect(await properties.findByRole('button', { name: 'Situação: Arquivado' })).toBeEnabled();
  expect(api.patch).toHaveBeenNthCalledWith(1, '/project/9/archive', { archived: true, version: project.version });

  await user.click(properties.getByRole('button', { name: 'Fixado: Não' }));
  await user.click(await screen.findByRole('menuitemradio', { name: 'Sim' }));
  expect(await properties.findByRole('button', { name: 'Fixado: Sim' })).toBeEnabled();
  expect(api.patch).toHaveBeenNthCalledWith(2, '/project/9/favorite', { favorite: true, version: project.version + 1 });
});

it('mantém a cor escolhida após conflito e permite salvar com a versão recarregada', async () => {
  let current = { ...project, color: '#d95721' };
  serve(() => current);
  vi.mocked(api.patch).mockImplementationOnce(async () => {
    current = { ...current, version: current.version + 1, color: '#446677' };
    throw { isAxiosError: true, response: { status: 409, data: {} } };
  }).mockImplementation(async (_url, body) => {
    current = { ...current, color: body.color, version: current.version + 1 };
    return { data: current };
  });
  const user = userEvent.setup();
  showProject();
  await user.click(await screen.findByRole('button', { name: 'Cor: #D95721' }));
  const picker = within(await screen.findByRole('dialog', { name: 'Editar cor do projeto' }));
  const input = picker.getByLabelText('Cor do projeto');
  fireEvent.change(input, { target: { value: '#123456' } });
  await user.click(picker.getByRole('button', { name: 'Salvar cor' }));
  expect(await picker.findByRole('alert')).toHaveTextContent(/mudaram em outra sessão/i);
  expect(input).toHaveValue('#123456');
  await user.click(picker.getByRole('button', { name: 'Recarregar dados' }));
  expect(input).toHaveValue('#123456');
  await user.click(picker.getByRole('button', { name: 'Salvar cor' }));
  expect(await screen.findByRole('button', { name: 'Cor: #123456' })).toBeEnabled();
  expect(api.patch).toHaveBeenNthCalledWith(1, '/project/9', { color: '#123456', version: project.version });
  expect(api.patch).toHaveBeenNthCalledWith(2, '/project/9', { color: '#123456', version: project.version + 1 });
});

it('mostra a remoção da cor como rascunho e aplica ao salvar', async () => {
  let current: WorkProject = { ...project, color: '#123456' };
  serve(() => current);
  vi.mocked(api.patch).mockImplementation(async (_url, body) => {
    current = { ...current, color: body.color, version: current.version + 1 };
    return { data: current };
  });
  const user = userEvent.setup();
  showProject();
  await user.click(await screen.findByRole('button', { name: 'Cor: #123456' }));
  const picker = within(await screen.findByRole('dialog', { name: 'Editar cor do projeto' }));
  expect(picker.getByText('#123456')).toBeVisible();
  await user.click(picker.getByRole('button', { name: 'Remover cor' }));
  expect(picker.getByText('Sem cor')).toBeVisible();
  expect(api.patch).not.toHaveBeenCalled();
  await user.click(picker.getByRole('button', { name: 'Salvar cor' }));
  expect(await screen.findByRole('button', { name: 'Cor: Sem cor' })).toBeEnabled();
  expect(api.patch).toHaveBeenCalledWith('/project/9', { color: null, version: project.version });
});

it.each([null, '  \n  '])('oferece adicionar descrição e omite a capa ausente (%j)', async emptyDescription => {
  serve(() => ({ ...project, description: emptyDescription }));
  showProject();

  expect(await screen.findByRole('heading', { level: 1, name: project.title })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Adicionar descrição' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Adicionar capa' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Editar descrição' })).not.toBeInTheDocument();
  expect(screen.queryByRole('img', { name: /^Capa de / })).not.toBeInTheDocument();
});

it('mostra o limite de upload da API ao escolher uma capa grande', async () => {
  const { container } = showProject();
  await screen.findByRole('button', { name: 'Adicionar capa' });
  const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'capa.png', { type: 'image/png' });
  fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
  expect(await screen.findByText('Use uma imagem PNG, JPEG ou WebP de até 2 MB.')).toBeVisible();
});

it('salva o documento de blocos no Panorama e lê o valor ao reabrir a rota', async () => {
  let current = project;
  serve(() => current);
  vi.mocked(api.patch).mockImplementation(async (_url, body) => {
    current = { ...current, description, descriptionDoc: body.descriptionDoc, version: current.version + 1 };
    return { data: current };
  });
  const user = userEvent.setup();
  const mounted = showProject();
  await user.click(await screen.findByRole('button', { name: 'Adicionar descrição' }));

  const section = screen.getByRole('region', { name: 'Descrição' });
  const field = await within(section).findByRole('textbox', { name: 'Descrição' });
  expect(field).toHaveFocus();
  fireEvent.change(field, { target: { value: description } });
  await user.click(within(section).getByRole('button', { name: 'Salvar descrição' }));

  const edit = await screen.findByRole('button', { name: 'Editar descrição' });
  expect(within(screen.getByRole('region', { name: 'Descrição' })).getByRole('paragraph').textContent).toBe(description);
  expect(api.patch).toHaveBeenCalledExactlyOnceWith('/project/9', {
    descriptionDoc: descriptionFromText(description), version: project.version,
  });
  expect(edit).toBeVisible();
  mounted.unmount();
  showProject();
  expect(await screen.findByRole('button', { name: 'Editar descrição' })).toBeVisible();
  expect(within(screen.getByRole('region', { name: 'Descrição' })).getByRole('paragraph').textContent).toBe(description);
});

it('pagina a atividade, recupera uma falha da próxima página e permite voltar', async () => {
  let failNext = true;
  serve(() => project, page => {
    if (page === 1 && failNext) {
      failNext = false;
      throw { isAxiosError: true, response: { status: 500, data: { message: 'Atividade indisponível.' } } };
    }
    return {
      page, actor: 'Pessoa de teste', hasNext: page === 0,
      items: [{
        id: 2 - page, kind: page === 0 ? 'TASK_COMPLETED' : 'PROJECT_CREATED', occurredAt: '2026-11-27T14:00:00Z',
        subjectId: page === 0 ? 17 : null, subjectTitle: page === 0 ? 'Revisar a landing' : null,
      }],
    };
  });
  const user = userEvent.setup();
  showProject();

  const feed = await screen.findByRole('region', { name: 'Atividade' });
  const navigation = within(await within(feed).findByRole('navigation', { name: 'Paginação da atividade' }));
  const previous = navigation.getByRole('button', { name: 'Página anterior' });
  const next = navigation.getByRole('button', { name: 'Próxima página' });
  const currentItem = async () => within(await within(feed).findByRole('list', { name: 'Alterações no projeto' })).getByRole('listitem');
  const completed = await currentItem();
  expect(completed).toHaveTextContent('Pessoa de teste concluiu a tarefa Revisar a landing.');
  const completedIcon = completed.querySelector('svg[aria-hidden="true"]');
  expect(completedIcon).toBeInTheDocument();
  expect(previous).toHaveAttribute('aria-disabled', 'true');
  expect(navigation.getByRole('status')).toHaveTextContent('Página 1');

  await user.click(next);
  const feedback = await within(feed).findByRole('alert');
  expect(feedback).toHaveTextContent('Atividade indisponível.');
  expect(next).toHaveFocus();
  await user.click(within(feedback).getByRole('button', { name: 'Recarregar dados' }));
  expect(api.get).toHaveBeenCalledWith('/project/9/activity', expect.objectContaining({ params: { page: 1, size: 5 } }));
  const created = await currentItem();
  expect(created).toHaveTextContent('Pessoa de teste criou o projeto.');
  const createdIcon = created.querySelector('svg[aria-hidden="true"]');
  expect(createdIcon).toBeInTheDocument();
  expect(createdIcon?.innerHTML).not.toBe(completedIcon?.innerHTML);
  expect(navigation.getByRole('status')).toHaveTextContent('Página 2');
  expect(next).toHaveAttribute('aria-disabled', 'true');

  await user.click(previous);
  expect(await currentItem()).toHaveTextContent('Pessoa de teste concluiu a tarefa Revisar a landing.');
  expect(navigation.getByRole('status')).toHaveTextContent('Página 1');
  expect(previous).toHaveFocus();
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
  const imageUrl = '/projects-pictures/simples.png';
  serve(() => ({ ...project, mode: 'SIMPLE', description, imageUrl }));
  showProject('/tasks/project/9');

  const summary = await screen.findByRole('complementary', { name: 'Informações do projeto' });
  expect(screen.getByRole('img', { name: `Capa de ${project.title}` })).toHaveAttribute('src', imageUrl);
  expect(within(summary).getByRole('progressbar', { name: '0% dos objetivos concluídos' })).toBeVisible();
  expect(within(summary).getByRole('button', { name: 'Próximo mês' })).toBeEnabled();
  expect(within(summary).getByRole('button', { name: 'Usar quadro de tarefas' })).toBeEnabled();
  expect(screen.queryByRole('region', { name: 'Descrição' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Propriedades' })).not.toBeInTheDocument();
});
