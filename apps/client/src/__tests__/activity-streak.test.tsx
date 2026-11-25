import { fireEvent, render, screen } from '@testing-library/react';
import type { UseQueryResult } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { ActivityStreak } from '@/components/statistics/ActivityStreak';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { ActivityStreakData } from '@/types/statistics';

const data: ActivityStreakData = { today: '2026-11-15', days: 7, startDate: '2026-11-08', throughDate: '2026-11-14', lowerBound: false, coverageFrom: '2026-11-01' };
function mount(value: ActivityStreakData | undefined, overrides = {}) {
  const query = { data: value, isPending: false, isError: false, isFetching: false, refetch: vi.fn(), ...overrides } as unknown as UseQueryResult<ActivityStreakData, Error>;
  render(<TooltipProvider><ActivityStreak query={query} /></TooltipProvider>);
  return query;
}
describe('sequência de atividade', () => {
  it('mostra a sequência com chama e explica hoje pendente sem declarar quebra', () => {
    mount(data);
    const trigger = screen.getByRole('button', { name: /Sequência de atividade: 7 dias seguidos/ });
    expect(trigger.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(trigger).toHaveClass('text-streak');
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toHaveTextContent('Sua sequência continua até o fim do dia');
    expect(screen.getByRole('dialog')).toHaveTextContent('08/11/2026 – 14/11/2026');
  });
  it('nomeia a cobertura incompleta e usa singular para um único dia', () => {
    mount({ ...data, days: 1, lowerBound: true, startDate: data.today, throughDate: data.today });
    fireEvent.click(screen.getByRole('button', { name: /Pelo menos 1 dia seguido/ }));
    expect(screen.getByRole('dialog')).toHaveTextContent('O início pode ser anterior ao histórico confiável');
    expect(screen.queryByText(/Ainda sem atividade hoje/)).not.toBeInTheDocument();
  });
  it('separa zero confirmado de informação desconhecida', () => {
    mount({ ...data, days: 0, startDate: null, throughDate: null });
    fireEvent.click(screen.getByRole('button', { name: /0 dias seguidos/ }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Nenhuma sequência ativa');
  });
  it('não converte ausência de cobertura em zero', () => {
    mount({ ...data, days: null, startDate: null, throughDate: null });
    fireEvent.click(screen.getByRole('button', { name: /Sequência: —/ }));
    expect(screen.getByRole('dialog')).toHaveTextContent('A cobertura histórica ainda não permite determinar');
  });
  it('preserva a contagem após falha de atualização e oferece tentativa real', () => {
    const query = mount(data, { isError: true });
    fireEvent.click(screen.getByRole('button', { name: /7 dias seguidos/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Mantendo a última contagem válida');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(query.refetch).toHaveBeenCalledOnce();
  });
  it('falha inicial fica indisponível e oferece uma nova tentativa sem mostrar zero', () => {
    mount(undefined, { isError: true });
    fireEvent.click(screen.getByRole('button', { name: /Sequência: —/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar a sequência');
    expect(screen.queryByText('0 dias seguidos')).not.toBeInTheDocument();
  });
  it('carregamento tem nome acessível', () => {
    mount(undefined, { isPending: true });
    expect(screen.getByRole('status')).toHaveAccessibleName('Carregando sequência de atividade');
    expect(screen.queryByText('0 dias seguidos')).not.toBeInTheDocument();
  });
});
