import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, startOfMonth, subDays, subYears } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AnalysisPanel, AnalysisEmpty, QueryContent } from '@/components/statistics/AnalysisPrimitives';
import { ActivityCalendar } from '@/components/statistics/ActivityCalendar';
import { ActivityStreak } from '@/components/statistics/ActivityStreak';
import { StatisticsPeriodPicker } from '@/components/statistics/StatisticsPeriodPicker';
import { HabitManager, HabitMatrix } from '@/components/statistics/HabitAnalysis';
import { FinanceChart } from '@/components/statistics/AnalysisCharts';
import { StatisticsEvidence, type Evidence } from '@/components/statistics/StatisticsEvidence';
import { useActivity, useActivityStreak, useFinanceStatistics, useHabitStatistics, usePlanning } from '@/hooks/useStatistics';
import { useProductToday } from '@/hooks/useProductToday';
import { activityCells, countChange, dateKey, formatRate, intervalLabel, previousInterval, rate, rateChange } from '@/lib/statistics';
import { productDate } from '@/lib/product-time';
import { formatCurrency } from '@/lib/format';
import { centsAmount, moneyCents } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { Interval } from '@/types/statistics';

export function StatisticsPage() {
  const today = useProductToday();
  const [mode, setMode] = useState('30');
  const [period, setPeriod] = useState<Interval>(() => ({ startDate: dateKey(subDays(productDate(today), 29)), endDate: today }));
  const [annualEnd, setAnnualEnd] = useState(today), oldToday = useRef(today);
  const [allCategories, setAllCategories] = useState(false);
  const [selection, setSelection] = useState<Evidence | null>(null), [manageHabits, setManageHabits] = useState(false);
  const opener = useRef<HTMLElement>(null);
  useEffect(() => {
    if (mode !== 'custom') setPeriod({ startDate: dateKey(mode === 'month' ? startOfMonth(productDate(today)) : subDays(productDate(today), Number(mode) - 1)), endDate: today });
    setAnnualEnd(end => end === oldToday.current ? today : end); oldToday.current = today;
  }, [today, mode]);
  const annual = useMemo(() => ({ startDate: dateKey(addDays(subYears(productDate(annualEnd), 1), 1)), endDate: annualEnd }), [annualEnd]);
  const tasks = useActivity(period), planning = usePlanning(period), habits = useHabitStatistics(period), finance = useFinanceStatistics(period);
  const yearTasks = useActivity(annual), yearHabits = useHabitStatistics(annual);
  const streak = useActivityStreak();
  const queries = [tasks, planning, habits, finance, yearTasks, yearHabits, streak];
  const updating = queries.some(q => q.isFetching), previous = previousInterval(period);
  const days = useMemo(() => activityCells(period, today, tasks.data, habits.data), [period, today, tasks.data, habits.data]);
  const activeDays = days.filter(d => d.total > 0).length, partialCoverage = days.some(d => !d.covered);
  const stamps = queries.map(q => q.dataUpdatedAt).filter(Boolean), updatedAt = stamps.length ? Math.min(...stamps) : null;
  function evidence(next: Evidence, element: HTMLElement) { opener.current = element; setSelection(next); }
  function openHabits(element: HTMLElement) { opener.current = element; setManageHabits(true); }
  const comparison = `Anterior: ${intervalLabel(previous)}`;
  return <div className="statistics-screen flex min-w-0 w-full flex-col gap-4">
    <PageHeader className="w-full" title="Estatísticas" description={<> {intervalLabel(period)}{period.endDate === today ? ' · período parcial, hoje em andamento' : ''}</>} isLoading={updating}
      actions={<><StatisticsPeriodPicker value={period} today={today} onChange={setPeriod} mode={mode} onModeChange={setMode} /><Button variant="ghost" size="icon" aria-label="Atualizar estatísticas" disabled={updating} onClick={() => void Promise.allSettled(queries.map(q => q.refetch()))}><RefreshCw data-icon="inline-start" /></Button></>} />
    <div className="flex w-full flex-wrap items-center justify-between gap-2 text-sm">
      {!tasks.data && !habits.data && (tasks.isPending || habits.isPending) ? <Skeleton className="h-7 w-72" /> : <p className="min-w-0 flex-1 basis-80"><strong className="text-2xl font-semibold tabular-nums">{tasks.data || habits.data ? activeDays : '—'}</strong> dias com registros no período · <strong className="font-semibold tabular-nums">{tasks.data?.total ?? '—'}</strong> tarefas concluídas{partialCoverage ? ' · cobertura parcial' : ''}{tasks.data && <span className="ml-2 text-xs text-muted-foreground">Conclusões: {countChange(tasks.data.total, tasks.data.previousTotal)}{previous.startDate < tasks.data.coverageFrom ? ' · histórico anterior parcial' : ''}.</span>}</p>}
      <div className="flex flex-wrap items-center gap-3"><ActivityStreak query={streak} /><p className="text-xs text-muted-foreground">{updatedAt ? `Atualizado às ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Recife', hour: '2-digit', minute: '2-digit' }).format(updatedAt)}` : 'Aguardando dados'}</p></div>
    </div>
    <ActivityCalendar period={annual} today={today} tasks={yearTasks} habits={yearHabits} onWindowChange={setAnnualEnd} onSelect={(date, element) => evidence({ kind: 'day', period: { startDate: date, endDate: date } }, element)} />
    <div className="grid w-full min-w-0 items-start gap-4 xl:grid-cols-12">
      <AnalysisPanel title="Planejamento" description={intervalLabel(period)} className="xl:col-span-5" action={<Button variant="link" onClick={e => evidence({ kind: 'planned', period }, e.currentTarget)}>Detalhar</Button>}>
        <QueryContent query={planning} label="planejamento">{data => <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3"><p><strong className="text-2xl font-semibold tabular-nums">{data.current.completed}</strong><span className="text-sm text-muted-foreground"> / {data.current.planned} previstas</span></p><span className="text-lg tabular-nums">{formatRate(rate(data.current.completed, data.current.planned))}</span></div>
          <Progress value={rate(data.current.completed, data.current.planned) ?? 0} aria-label="Conclusão das tarefas planejadas" className="h-2" />
          <p className="text-xs text-muted-foreground">{data.current.planned === 0 ? 'Nenhuma tarefa planejada neste período.' : rateChange(data.current.completed, data.current.planned, data.previous.completed, data.previous.planned)}</p>
          <div className="flex flex-col gap-1"><p className="text-sm">Anterior: <span className="tabular-nums">{data.previous.completed}/{data.previous.planned}</span> previstas · {formatRate(rate(data.previous.completed, data.previous.planned))}</p><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{intervalLabel(previous)}</p><Button variant="link" className="h-auto p-0" onClick={e => evidence({ kind: 'planned', period: previous }, e.currentTarget)}>Ver planejamento anterior</Button></div></div>
          <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-medium">Atrasadas hoje</h3><Button variant="link" className="h-auto p-0" onClick={e => evidence({ kind: 'overdue', period: { startDate: today, endDate: today } }, e.currentTarget)}>{data.overdue} tarefas</Button></div>
          {data.overdue === 0 ? <p className="text-sm text-muted-foreground">Nenhuma tarefa com prazo ultrapassado hoje.</p> : <div className="flex flex-col gap-1">{data.overdueByProject.slice(0, 3).map(group => <button key={group.projectId ?? 'none'} type="button" className="flex items-center justify-between gap-3 py-0.5 text-left text-sm hover:underline" onClick={e => evidence({ kind: 'overdue', period: { startDate: today, endDate: today }, projectId: group.projectId ?? undefined, projectName: group.title, unassigned: group.projectId === null }, e.currentTarget)}><span className="truncate">{group.title}</span><span className="tabular-nums">{group.total}</span></button>)}</div>}
        </div>}</QueryContent>
      </AnalysisPanel>
      <AnalysisPanel title="Hábitos" description={intervalLabel(period)} className="xl:col-span-7" action={<Button variant="link" onClick={e => openHabits(e.currentTarget)}>Gerenciar</Button>}>
        <QueryContent query={habits} label="hábitos">{data => data.habits.length === 0 ? <AnalysisEmpty title="Comece um hábito" description="Escolha dias fixos e registre uma execução por dia programado." action={<Button onClick={e => openHabits(e.currentTarget)}>Cadastrar hábito</Button>} /> : <div className="flex flex-col gap-3"><div className="flex flex-wrap items-baseline justify-between gap-2"><p><strong className="text-2xl font-semibold tabular-nums">{formatRate(rate(data.completed, data.expected))}</strong><span className="text-sm text-muted-foreground"> · {data.completed}/{data.expected} ocorrências</span></p><span className="text-xs text-muted-foreground">{rateChange(data.completed, data.expected, data.previousCompleted, data.previousExpected)}</span></div><HabitMatrix habits={data.habits} period={period} today={today} compact onManage={() => { opener.current = document.activeElement as HTMLElement; setManageHabits(true); }} /></div>}</QueryContent>
      </AnalysisPanel>
      <AnalysisPanel title="Financeiro registrado" description={intervalLabel(period)} className="xl:col-span-8" action={<Button variant="link" onClick={e => evidence({ kind: 'finance', period }, e.currentTarget)}>Lançamentos</Button>}>
        <QueryContent query={finance} label="resumo financeiro">{data => <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Resultado do período</p><p className={cn('mt-1 text-2xl font-semibold tabular-nums', moneyCents(data.current.result) < 0n && 'text-negative')}>{formatCurrency(data.current.result)}</p><p className="mt-1 text-xs text-muted-foreground">{moneyCents(data.current.result) > moneyCents(data.previous.result) ? '+' : ''}{formatCurrency(centsAmount(moneyCents(data.current.result) - moneyCents(data.previous.result)))} vs. período anterior</p></div><div><p className="text-xs text-muted-foreground">Receitas</p><p className="mt-1 text-lg tabular-nums">{formatCurrency(data.current.income)}</p></div><div><p className="text-xs text-muted-foreground">Despesas</p><p className="mt-1 text-lg tabular-nums">{formatCurrency(data.current.expenses)}</p></div></div>
          {data.current.entries === 0 && <p className="text-sm text-muted-foreground">Nenhum lançamento registrado neste período.</p>}
          <FinanceChart period={period} days={data.days} /><p className="text-xs text-muted-foreground">Resultado dos lançamentos por data registrada, sem saldo inicial de conta.{data.automaticEntries > 0 ? ` Inclui ${data.automaticEntries} registros automáticos de recorrências, sem confirmação de pagamento.` : ''}</p>
        </div>}</QueryContent>
      </AnalysisPanel>
      <AnalysisPanel title="Despesas por categoria" description={intervalLabel(period)} className="xl:col-span-4">
        <QueryContent query={finance} label="categorias financeiras">{data => data.categories.length === 0 ? <AnalysisEmpty title="Nenhuma despesa registrada" description="As categorias aparecerão quando houver despesas neste período." /> : <div className="flex flex-col gap-4">{(allCategories ? data.categories : data.categories.slice(0, 5)).map(category => <button type="button" key={category.tagId} className="flex flex-col gap-2 text-left" aria-label={`Ver ${category.name}: ${formatCurrency(category.amount)}`} onClick={e => evidence({ kind: 'finance', period, tagId: category.tagId, tagName: category.name }, e.currentTarget)}><span className="flex items-start justify-between gap-3 text-sm"><span className="min-w-0 break-words">{category.name}</span><span className="shrink-0 tabular-nums">{formatCurrency(category.amount)}</span></span><span className="h-2 w-full bg-muted" aria-hidden><span className="block h-full bg-chart-1" style={{ width: `${Number(moneyCents(category.amount)) / Number(moneyCents(data.categories[0].amount)) * 100}%` }} /></span></button>)}{data.categories.length > 5 && <Button variant="link" className="self-start" onClick={() => setAllCategories(value => !value)}>{allCategories ? 'Mostrar cinco categorias' : `Mostrar todas · ${data.categories.length} categorias`}</Button>}<Button variant="link" className="self-start" onClick={e => evidence({ kind: 'finance', period }, e.currentTarget)}>Ver todos os lançamentos · {data.current.entries}</Button></div>}</QueryContent>
      </AnalysisPanel>
    </div>
    <div className="flex w-full flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><p>Reabrir/excluir tarefas ou reagendar o planejamento altera o histórico. {comparison} · mesma duração{period.endDate === today ? '; período atual ainda parcial' : ''}.</p><Button variant="link" onClick={e => evidence({ kind: 'completed', period }, e.currentTarget)}>Explorar conclusões · {tasks.data?.total ?? '—'}</Button></div>
    {selection && <StatisticsEvidence key={JSON.stringify(selection)} selection={selection} onClose={() => setSelection(null)} opener={opener} />}
    <HabitManager open={manageHabits} onOpenChange={setManageHabits} today={today} opener={opener} />
  </div>;
}
