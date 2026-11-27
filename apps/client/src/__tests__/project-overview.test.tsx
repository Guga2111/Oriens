import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import api from '@/services/api';
import { descriptionFromText } from '@/components/tasks/description/descriptionContent';
import type { WorkProject, TaskDescriptionDocument, ProjectActivityPage } from '@/types/work';
import { board, project, renderWork } from './work-fixtures';

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
})) {
  vi.mocked(api.get).mockImplementation(async (url, config) => {
    if (url === '/project/9/activity') return { data: readActivity(config.params.page) };
    return { data: url === '/project/9/board' ? board : readProject() };
  });
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
  expect(screen.getByRole('button', { name: 'Trocar capa' })).toBeEnabled();
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

it('lista a atividade do projeto e acrescenta a página seguinte', async () => {
  serve(() => project, page => ({
    page, actor: 'Pessoa de teste', hasNext: page === 0,
    items: [{
      id: 2 - page, kind: page === 0 ? 'TASK_COMPLETED' : 'PROJECT_CREATED', occurredAt: '2026-11-27T14:00:00Z',
      subjectId: page === 0 ? 17 : null, subjectTitle: page === 0 ? 'Revisar a landing' : null,
    }],
  }));
  showProject();

  const feed = await screen.findByRole('region', { name: 'Atividade' });
  const more = await within(feed).findByRole('button', { name: 'Carregar mais' });
  expect(within(feed).getByRole('listitem')).toHaveTextContent('Pessoa de teste concluiu a tarefa Revisar a landing.');
  await userEvent.click(more);
  expect(await within(feed).findAllByRole('listitem')).toHaveLength(2);
  expect(within(feed).getAllByRole('listitem')[1]).toHaveTextContent('Pessoa de teste criou o projeto.');
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
