import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { project, renderWork } from './work-fixtures';
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
describe('P4 cards — contagens e próximo passo', () => {
  it('não inventa percentual global ou próximo passo sem planejamento', () => {
    renderWork(<ProjectCard project={project} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('0/1 tarefas concluídas')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByRole('link', { name: 'Planejar próxima tarefa' })).toHaveAttribute('href', '/tasks/project/9?planning=unscheduled&open=1');
    expect(screen.queryByRole('img')).toBeNull();
  });
  it('simples calcula a mesma fração e objetivo sem prazo não ganha data', () => {
    renderWork(<ProjectCard project={{ ...project, mode: 'SIMPLE', summary: { ...project.summary, completedObjectives: 1, totalObjectives: 3, nextObjective: null } }} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByLabelText('33% dos objetivos concluídos')).toHaveAttribute('aria-valuenow', '33');
    expect(screen.getByText('Objetivos sem prazo')).toBeInTheDocument();
  });
  it('zero objetivos e apenas canceladas não mostram conclusão completa', () => {
    renderWork(<ProjectCard project={{ ...project, summary: { ...project.summary, totalObjectives: 0, nonCancelledTasks: 0, cancelledTasks: 2 } }} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Nenhum objetivo definido')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma tarefa ativa · 2 canceladas')).toBeInTheDocument();
  });
});
