import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { intervalDays, moneyBins, moneyTicks, shortDate, volumeBins } from '@/lib/statistics';
import { formatCurrency } from '@/lib/format';
import { integerTicks } from './chartTicks';
import type { DayCount, Interval, MoneyDay } from '@/types/statistics';

const financeConfig = { income: { label: 'Receitas', color: 'hsl(var(--chart-1))' }, expenses: { label: 'Despesas', color: 'hsl(var(--muted-foreground))' } } satisfies ChartConfig;
const taskConfig = { completed: { label: 'Tarefas concluídas', color: 'hsl(var(--chart-1))' } } satisfies ChartConfig;
const dateTick = (date: string) => shortDate(date).slice(0, 5);

export function FinanceChart({ period, days }: { period: Interval; days: MoneyDay[] }) {
  const bins = moneyBins(period, days);
  const maximum = Math.max(0, ...bins.flatMap(b => [b.income, b.expenses]));
  const ticks = moneyTicks(maximum), ceiling = ticks[ticks.length - 1];
  return <div className="flex flex-col gap-2">
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="size-2 bg-chart-1" aria-hidden />Receitas</span><span className="flex items-center gap-2"><span className="size-2 bg-muted-foreground" aria-hidden />Despesas</span><span>R$ · {intervalDays(period).length <= 31 ? 'por dia' : 'por semana'}</span></div>
    <ChartContainer config={financeConfig} className="h-[180px] w-full" role="img" aria-label="Receitas e despesas registradas no período. Valores disponíveis na tabela.">
      <BarChart accessibilityLayer data={bins} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} /><XAxis dataKey="date" tickFormatter={dateTick} tickLine={false} axisLine={false} minTickGap={40} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={54} domain={[0, ceiling]} ticks={ticks} tickFormatter={value => new Intl.NumberFormat('pt-BR', { notation: value >= 1000 ? 'compact' : 'standard', maximumFractionDigits: value > 0 && value < 1 ? 2 : 1 }).format(value)} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(_, payload) => { const row = payload?.[0]?.payload; return row ? `${shortDate(row.date)}${row.end !== row.date ? ` – ${shortDate(row.end)}` : ''}` : ''; }} formatter={(_, name, item) => <span className="flex w-full justify-between gap-4"><span>{name === 'income' ? 'Receitas' : 'Despesas'}</span><span className="tabular-nums">{formatCurrency(item.payload[`${String(name)}Exact`])}</span></span>} />} />
        <Bar dataKey="income" fill="var(--color-income)" radius={[2, 2, 0, 0]} isAnimationActive={false} /><Bar dataKey="expenses" fill="var(--color-expenses)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
    <Collapsible><CollapsibleTrigger asChild><Button variant="link">Ver valores em tabela</Button></CollapsibleTrigger><CollapsibleContent className="max-h-72 overflow-auto"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead className="text-right">Receitas</TableHead><TableHead className="text-right">Despesas</TableHead></TableRow></TableHeader><TableBody>{bins.map(b => <TableRow key={b.date}><TableCell>{shortDate(b.date)}{b.end !== b.date && ` – ${shortDate(b.end)}`}</TableCell><TableCell className="text-right tabular-nums">{formatCurrency(b.incomeExact)}</TableCell><TableCell className="text-right tabular-nums">{formatCurrency(b.expensesExact)}</TableCell></TableRow>)}</TableBody></Table></CollapsibleContent></Collapsible>
  </div>;
}
export function TaskVolumeChart({ period, days, coverageFrom }: { period: Interval; days: DayCount[]; coverageFrom: string }) {
  const raw = volumeBins(period, days), ticks = integerTicks(Math.max(0, ...raw.map(b => b.completed)));
  const bins = raw.map(b => ({ ...b, partial: b.date < coverageFrom, completed: b.date < coverageFrom && b.completed === 0 ? null : b.completed }));
  return <div className="flex flex-col gap-2">{period.startDate < coverageFrom && <p className="text-xs text-muted-foreground">Antes de {shortDate(coverageFrom)}, contagens são parciais e ausência de registro não é zero confirmado.</p>}<ChartContainer config={taskConfig} className="h-[180px] w-full" role="img" aria-label="Volume de tarefas concluídas por dia ou semana; valores na tabela abaixo."><BarChart accessibilityLayer data={bins} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><CartesianGrid vertical={false} /><XAxis dataKey="date" tickFormatter={dateTick} tickLine={false} axisLine={false} minTickGap={40} /><YAxis ticks={ticks} domain={[0, Math.max(...ticks)]} allowDecimals={false} tickLine={false} axisLine={false} width={32} /><ChartTooltip content={<ChartTooltipContent labelFormatter={value => shortDate(String(value))} />} /><Bar dataKey="completed" fill="var(--color-completed)" isAnimationActive={false} radius={[2, 2, 0, 0]} /></BarChart></ChartContainer><Collapsible><CollapsibleTrigger asChild><Button variant="link">Ver contagens em tabela</Button></CollapsibleTrigger><CollapsibleContent className="max-h-72 overflow-auto"><Table><TableHeader><TableRow><TableHead>Intervalo</TableHead><TableHead className="text-right">Conclusões</TableHead></TableRow></TableHeader><TableBody>{bins.map(b => <TableRow key={b.date}><TableCell>{shortDate(b.date)}{b.end !== b.date && ` – ${shortDate(b.end)}`}</TableCell><TableCell className="text-right tabular-nums">{b.completed === null ? 'Sem cobertura' : `${b.completed}${b.partial ? ' (parcial)' : ''}`}</TableCell></TableRow>)}</TableBody></Table></CollapsibleContent></Collapsible></div>;
}
