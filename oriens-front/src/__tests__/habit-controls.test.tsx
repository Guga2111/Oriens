import type { UseQueryResult } from '@tanstack/react-query';
import { ActivityCalendar } from '@/components/statistics/ActivityCalendar';
import type { ActivityData, HabitsData } from '@/types/statistics';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkDatePicker } from '@/components/common/WorkDatePicker';
import { HabitMatrix } from '@/components/statistics/HabitAnalysis';
import { TooltipProvider } from '@/components/ui/tooltip';
import { intervalDays } from '@/lib/statistics';
import type { Habit } from '@/types/statistics';

vi.mock('@/hooks/useProductToday', () => ({ useProductToday: () => '2026-11-15' }));
vi.mock('@/hooks/useStatistics', () => ({ useHabitWrites: () => ({ mutate: vi.fn(), isPending: false }) }));

describe('controles de hábitos', () => {
  it('respeita limites inclusivos e não limpa uma data obrigatória', () => {
    const changed = vi.fn();
    render(<WorkDatePicker label="Execução" value="2026-11-15" min="2026-11-10" max="2026-11-15" required onChange={changed} />);
    expect(screen.queryByRole('button', { name: /Limpar/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Execução:/ }));
    expect(screen.getByRole('gridcell', { name: '9' })).toBeDisabled();
    expect(screen.getByRole('gridcell', { name: '16' })).toBeDisabled();
    expect(screen.getByRole('gridcell', { name: '10' })).not.toBeDisabled();
    fireEvent.click(screen.getByRole('gridcell', { name: '15' }));
    expect(changed).toHaveBeenCalledWith('2026-11-15');
  });
  it('preserva a limpeza explícita para datas opcionais', () => {
    const changed = vi.fn();
    render(<WorkDatePicker label="Prazo" value="2026-11-15" onChange={changed} />);
    fireEvent.click(screen.getByRole('button', { name: 'Limpar prazo' }));
    expect(changed).toHaveBeenCalledWith('');
  });
  it('a consulta de data abre a evidência mesmo ao escolher o dia já selecionado', () => {
    const period = { startDate: '2026-11-01', endDate: '2026-11-15' };
    const onSelect = vi.fn();
    const query = { data: { days: [], coverageFrom: period.startDate }, isPending: false, isError: false };
    render(<TooltipProvider><ActivityCalendar period={period} today={period.endDate} tasks={query as unknown as UseQueryResult<ActivityData, Error>} habits={query as unknown as UseQueryResult<HabitsData, Error>} onSelect={onSelect} onWindowChange={vi.fn()} /></TooltipProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Consultar atividade por data' }));
    fireEvent.click(screen.getByRole('gridcell', { name: /15 de novembro de 2026/ }));
    expect(onSelect).toHaveBeenCalledWith('2026-11-15', expect.any(HTMLButtonElement));
  });
  it('navega por todos os dias sem alterar os totais do período e volta ao fim ao mudar o período', () => {
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600);
    const period = { startDate: '2026-10-17', endDate: '2026-11-15' };
    const dates = intervalDays(period);
    const habit = { id: 1, name: 'Ler', completed: 7, expected: 30, days: dates.map(date => ({ date, state: date === period.endDate ? 'PENDING' : 'DONE' })) } as Habit;
    const ui = (value = period) => <TooltipProvider><HabitMatrix habits={[habit]} period={value} today={period.endDate} onManage={vi.fn()} /></TooltipProvider>;
    const { container, rerender } = render(ui());
    const seen = new Set<string>();
    const remember = () => container.querySelectorAll('abbr').forEach(cell => seen.add(cell.getAttribute('title')!));
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
    const previous = screen.getByRole('button', { name: 'Dias anteriores dos hábitos' });
    remember();
    while (!previous.hasAttribute('disabled')) { fireEvent.click(previous); remember(); }
    expect(seen.size).toBe(30);
    expect(screen.getByText('7/30')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    rerender(ui({ startDate: '2026-11-09', endDate: '2026-11-15' }));
    expect(container.querySelectorAll('abbr')).toHaveLength(7);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    act(() => width.mockRestore());
  });
});
