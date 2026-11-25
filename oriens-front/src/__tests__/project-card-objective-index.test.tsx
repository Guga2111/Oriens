import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { project, renderWork } from './work-fixtures';
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
/** The visible chip that carries this full reading. */
const chip = (label: string) => screen.getByText(label).parentElement!;
describe('P4 cards — contagens e próximo passo', () => {
  it('não inventa percentual global ou próximo passo sem planejamento', () => {
    renderWork(<ProjectCard project={project} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(chip('Tarefas concluídas: 0 de 1')).toHaveTextContent('0/1');
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByRole('link', { name: 'Planejar próxima tarefa' })).toHaveAttribute('href', '/tasks/project/9?planning=unscheduled&open=1');
    expect(screen.queryByRole('img')).toBeNull();
  });
  it('simples mostra a fração de objetivos e objetivo sem prazo não ganha data', () => {
    renderWork(<ProjectCard project={{ ...project, mode: 'SIMPLE', summary: { ...project.summary, completedObjectives: 1, totalObjectives: 3, nextObjective: null } }} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(chip('Objetivos concluídos: 1 de 3')).toHaveTextContent('1/3');
    expect(chip('Objetivos sem prazo')).toHaveTextContent('Sem prazo');
    expect(screen.queryByRole('link', { name: 'Planejar próxima tarefa' })).toBeNull();
  });
  it('zero objetivos e apenas canceladas não mostram conclusão completa', () => {
    renderWork(<ProjectCard project={{ ...project, summary: { ...project.summary, totalObjectives: 0, nonCancelledTasks: 0, cancelledTasks: 2 } }} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(chip('Nenhum objetivo definido')).toHaveTextContent('Sem objetivos');
    expect(chip('Nenhuma tarefa ativa · 2 canceladas')).toHaveTextContent('Sem tarefas');
  });
  it('o título leva ao projeto e as ações continuam acessíveis', () => {
    renderWork(<ProjectCard project={project} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Site pessoal' })).toHaveAttribute('href', '/tasks/project/9');
    expect(screen.getByRole('button', { name: 'Fixar Site pessoal' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Ações do projeto Site pessoal' })).toBeInTheDocument();
  });
  it('cada chip explica o que mostra: tooltip ao passar o mouse e leitura completa para leitores de tela', async () => {
    const { container } = renderWork(<ProjectCard project={{ ...project, color: '#e5484d', summary: { ...project.summary, overdueTaskCount: 1 } }} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const tasks = chip('Tarefas concluídas: 0 de 1');
    const attention = chip('Atenção: 1 tarefa com prazo ultrapassado');
    // Read-only facts stay out of the tab order; screen readers get the full reading from the chip itself.
    expect(tasks).not.toHaveAttribute('tabindex');
    await userEvent.hover(tasks);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Tarefas concluídas: 0 de 1');
    await userEvent.unhover(tasks);
    await userEvent.hover(attention);
    await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent('Atenção: 1 tarefa com prazo ultrapassado'));
    // The project's colour reaches the card as a CSS variable, not as an inline colour.
    expect(container.querySelector<HTMLElement>('[style*="--project-color"]')?.style.getPropertyValue('--project-color')).toBe('#e5484d');
  });
});
