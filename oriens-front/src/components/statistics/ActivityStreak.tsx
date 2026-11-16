import { Flame } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import { badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { shortDate } from '@/lib/statistics';
import { cn } from '@/lib/utils';
import type { ActivityStreakData } from '@/types/statistics';

export function ActivityStreak({ query }: { query: UseQueryResult<ActivityStreakData, Error> }) {
  if (!query.data && query.isPending) return <Skeleton className="h-8 w-40" role="status" aria-label="Carregando sequência de atividade" />;
  const data = query.data, days = data?.days, active = days != null && days > 0;
  const label = days == null ? 'Sequência: —' : days === 0 ? '0 dias seguidos' : `${data.lowerBound ? 'Pelo menos ' : ''}${days} ${days === 1 ? 'dia seguido' : 'dias seguidos'}`;
  return <Popover>
    <PopoverTrigger asChild><button type="button" className={cn(badgeVariants({ variant: active ? 'streak' : 'outline' }), 'min-h-11 gap-2 md:min-h-8')} title="Dias consecutivos com tarefa concluída ou hábito executado. Toque para ver a regra completa." aria-label={`Sequência de atividade: ${label}. Ver regra${query.isError ? '. Atualização indisponível' : ''}`}>
      <Flame className="size-4 shrink-0" aria-hidden="true" />
      <span className="tabular-nums">{label}</span>{query.isError && <span className="text-muted-foreground">· {data ? 'desatualizada' : 'indisponível'}</span>}
    </button></PopoverTrigger>
    <PopoverContent align="start" className="flex max-w-[calc(100vw-2rem)] flex-col gap-3 text-sm" aria-label="Como funciona a sequência de atividade">
      <h2 className="font-semibold">Sequência de atividade</h2>
      <p>Um dia com pelo menos uma tarefa concluída ou execução de hábito mantém a sequência. Várias realizações no mesmo dia contam uma vez.</p>
      {data?.startDate && data.throughDate && <p className="tabular-nums">{shortDate(data.startDate)} – {shortDate(data.throughDate)}</p>}
      {active && data.throughDate !== data.today && <p>Ainda sem atividade hoje. Sua sequência continua até o fim do dia.</p>}
      {days === 0 && <p>Nenhuma sequência ativa. Uma realização hoje começa uma nova sequência.</p>}
      {days === null && <p>A cobertura histórica ainda não permite determinar a sequência.</p>}
      {data?.lowerBound && <p>O início pode ser anterior ao histórico confiável. Exibimos somente os dias com registros.</p>}
      <p className="text-muted-foreground">Dias de calendário, inclusive fins de semana, no fuso de Recife. Independente dos filtros. Reabrir ou excluir tarefas e desmarcar hábitos recalcula a sequência.</p>
      {query.isError && <div role="alert" className="flex flex-col gap-2"><p>{data ? 'Atualização falhou. Mantendo a última contagem válida.' : 'Não foi possível carregar a sequência.'}</p><Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>Tentar novamente</Button></div>}
    </PopoverContent>
  </Popover>;
}
