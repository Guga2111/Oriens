import { useEffect, useRef, useState } from 'react';
import { Archive, Check, ChevronLeft, ChevronRight, Pause, Pencil, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field';
import { WorkDatePicker } from '@/components/common/WorkDatePicker';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useHabitStatistics, useHabitWrites } from '@/hooks/useStatistics';
import { AnalysisEmpty, QueryContent } from './AnalysisPrimitives';
import { formatRate, fullDate, intervalDays, rate, shortDate } from '@/lib/statistics';
import { cn } from '@/lib/utils';
import type { Habit, HabitCommand, HabitState, Interval } from '@/types/statistics';
import { toast } from 'sonner';

const states: Record<HabitState, string> = { DONE: 'Realizado', PENDING: 'Hoje em andamento', MISSED: 'Não realizado', OFF: 'Não programado', PAUSED: 'Em pausa', OUTSIDE: 'Fora da vigência' };
const weekdays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const errorText = (error: unknown) => (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Não foi possível salvar. Tente novamente.';

export function HabitMatrix({ habits, period, today, onManage, compact = false }: { habits: Habit[]; period: Interval; today: string; onManage: () => void; compact?: boolean }) {
  const write = useHabitWrites(), allDates = intervalDays(period), matrix = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(7), [lastDate, setLastDate] = useState(period.endDate);
  useEffect(() => { setLastDate(period.endDate); }, [period.startDate, period.endDate]);
  useEffect(() => {
    const element = matrix.current;
    if (!element) return;
    // Reserve 140px for the habit name; each day keeps its full touch target plus spacing.
    const measure = () => setColumns(Math.max(1, Math.min(14, Math.floor((element.clientWidth - 148) / ((parseFloat(getComputedStyle(element).getPropertyValue('--habit-cell')) || 28) + 3)))));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const end = Math.max(0, allDates.indexOf(lastDate < period.startDate || lastDate > period.endDate ? period.endDate : lastDate));
  const dates = allDates.slice(Math.max(0, end - columns + 1), end + 1);
  const first = end - dates.length + 1;
  const visibleDates = new Set(dates);
  const visible = compact ? habits.filter(h => h.expected > 0 || !h.archivedOn).slice(0, 4) : habits;
  return <div className="flex flex-col gap-3">
    {write.isError && <Alert><AlertDescription>{errorText(write.error)}</AlertDescription></Alert>}
    {allDates.length > columns && <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground" aria-live="polite">{shortDate(dates[0])} – {shortDate(dates[dates.length - 1])}</p>
      <div className="flex gap-1"><Button variant="outline" size="icon" aria-label="Dias anteriores dos hábitos" disabled={first === 0} onClick={() => setLastDate(allDates[first - 1])}><ChevronLeft aria-hidden /></Button><Button variant="outline" size="icon" aria-label="Próximos dias dos hábitos" disabled={end === allDates.length - 1} onClick={() => setLastDate(allDates[Math.min(allDates.length - 1, end + columns)])}><ChevronRight aria-hidden /></Button></div>
    </div>}
    <div ref={matrix} className="habit-matrix"><table aria-label="Execuções de hábitos por dia"><thead><tr><th scope="col">Hábito <span className="block text-xs">realizadas/previstas</span></th>{dates.map(d => <th scope="col" key={d}><abbr title={fullDate(d)} className="no-underline">{d.slice(8)}</abbr></th>)}</tr></thead><tbody>
      {visible.map(habit => <tr key={habit.id}><th scope="row"><div className="flex flex-col gap-0.5 pr-3 py-0.5"><span className="text-sm font-medium text-foreground">{habit.name}</span><span className="flex items-center gap-2"><span className="text-xs tabular-nums">{habit.completed}/{habit.expected}</span><Progress value={rate(habit.completed, habit.expected) ?? 0} className="h-1.5 w-16" aria-label={`Aderência de ${habit.name}`} /><span className="sr-only">{formatRate(rate(habit.completed, habit.expected))}</span></span></div></th>
        {habit.days.filter(day => visibleDates.has(day.date)).map(day => {
          const label = `${habit.name}, ${fullDate(day.date)}: ${states[day.state]}`;
          const mark = day.state === 'DONE' ? <Check className="size-3" aria-hidden /> : day.state === 'PAUSED' ? <Pause className="size-3" aria-hidden /> : day.state === 'MISSED' ? '−' : day.state === 'PENDING' ? '·' : ' ';
          const active = day.date === today && ['DONE', 'PENDING'].includes(day.state);
          return <td key={day.date}><Tooltip><TooltipTrigger asChild>{active ? <Checkbox className={cn('habit-mark after:hidden', `habit-${day.state}`)} checked={day.state === 'DONE'} aria-label={label} disabled={write.isPending} onCheckedChange={() => write.mutate({ action: 'execution', habit, date: day.date, completed: day.state !== 'DONE' }, { onSuccess: result => { if (result.refreshFailed) toast.warning('Execução salva. Atualize os dados para conferir o resultado.'); } })} />
            : <span className={cn('habit-mark', `habit-${day.state}`)} aria-label={label}>{mark}<span className="sr-only">{states[day.state]}</span></span>}</TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip></td>;
        })}
      </tr>)}
    </tbody></table></div>
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Realizado: marca preenchida · hoje pendente: contorno · não realizado: traço · pausa: barras · não programado: branco</p>{compact && habits.length > visible.length && <Button variant="link" onClick={onManage}>Todos os hábitos · {habits.length}</Button>}</div>
  </div>;
}

export function HabitManager({ open, onOpenChange, today, opener }: { open: boolean; onOpenChange: (open: boolean) => void; today: string; opener: React.RefObject<HTMLElement> }) {
  const [date, setDate] = useState(today), [editing, setEditing] = useState<Habit | 'new' | null>(null), [pausing, setPausing] = useState<Habit | null>(null), [archiving, setArchiving] = useState<Habit | null>(null);
  const priorToday = useRef(today);
  useEffect(() => { setDate(value => value === priorToday.current ? today : value); priorToday.current = today; }, [today]);
  const data = useHabitStatistics({ startDate: date, endDate: date }, open), write = useHabitWrites();
  async function submit(command: HabitCommand) {
    const result = await write.mutateAsync(command);
    if (result.refreshFailed) toast.warning('Alteração salva. Não foi possível atualizar a análise.');
    else toast.success('Hábito atualizado');
    return result;
  }
  return <>
    <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="w-full overflow-y-auto sm:max-w-3xl statistics-screen" onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus(); }}>
      <SheetHeader><SheetTitle>Hábitos</SheetTitle><SheetDescription>Programação, execuções e pausas. Dias não programados não são falhas.</SheetDescription></SheetHeader>
      <div className="mt-6 flex flex-col gap-4"><div className="flex flex-wrap items-end justify-between gap-3"><Field className="w-auto"><FieldLabel htmlFor="habit-record-date">Data de execução</FieldLabel><WorkDatePicker id="habit-record-date" label="Data de execução" value={date} max={today} required onChange={setDate} /></Field><Button onClick={() => setEditing('new')}><Plus aria-hidden data-icon="inline-start" />Novo hábito</Button></div>
        {write.isError && <Alert><AlertDescription>{errorText(write.error)} <Button variant="link" onClick={() => void data.refetch()}>Recarregar</Button></AlertDescription></Alert>}
        <QueryContent query={data} label="hábitos">{value => value.habits.length === 0 ? <AnalysisEmpty title="Seu primeiro hábito" description="Escolha os dias da semana e comece a registrar suas execuções." action={<Button onClick={() => setEditing('new')}>Cadastrar hábito</Button>} /> : <div className="flex flex-col gap-4">{value.habits.map(habit => {
          const state = habit.days[0]?.state ?? 'OUTSIDE', canExecute = ['DONE', 'PENDING', 'MISSED'].includes(state);
          const schedule = habit.schedules[habit.schedules.length - 1];
          return <div className="flex flex-col gap-2 rounded-md border p-4" key={habit.id}><div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-medium">{habit.name}</h3><p className="text-xs text-muted-foreground">{schedule?.weekdays.map(d => weekdays[d - 1].slice(0, 3)).join(' · ')} · desde {shortDate(habit.startDate)}{habit.archivedOn ? ` · arquivado a partir de ${shortDate(habit.archivedOn)}` : ''}</p></div><span className="text-xs text-muted-foreground">{states[state]}</span></div>
            <div className="flex flex-wrap items-center gap-2">{canExecute && <Button variant={state === 'DONE' ? 'outline' : 'default'} disabled={write.isPending} onClick={() => void submit({ action: 'execution', habit, date, completed: state !== 'DONE' }).catch(() => {})}>{state === 'DONE' ? <RotateCcw aria-hidden data-icon="inline-start" /> : <Check aria-hidden data-icon="inline-start" />}{state === 'DONE' ? 'Desmarcar execução' : 'Registrar execução'}</Button>}
              {!habit.archivedOn && <><Button variant="outline" size="sm" disabled={write.isPending} onClick={() => setEditing(habit)}><Pencil aria-hidden data-icon="inline-start" />Editar</Button><Button variant="outline" size="sm" disabled={write.isPending} onClick={() => setPausing(habit)}><Pause aria-hidden data-icon="inline-start" />Pausar</Button><Button variant="outline" size="sm" disabled={write.isPending} onClick={() => setArchiving(habit)}><Archive aria-hidden data-icon="inline-start" />Arquivar</Button></>}
            </div>{habit.pauses.length > 0 && <p className="text-xs text-muted-foreground">Pausas: {habit.pauses.map(p => `${shortDate(p.startDate)}–${shortDate(p.endDate)}`).join('; ')}</p>}
          </div>;
        })}</div>}</QueryContent>
      </div>
    </SheetContent></Sheet>
    {editing && <HabitEditor habit={editing} today={today} pending={write.isPending} onClose={() => setEditing(null)} onSave={submit} />}
    {pausing && <PauseEditor habit={pausing} today={today} pending={write.isPending} onClose={() => setPausing(null)} onSave={submit} />}
    <AlertDialog open={!!archiving} onOpenChange={next => { if (!next) setArchiving(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Arquivar {archiving?.name}?</AlertDialogTitle><AlertDialogDescription>As execuções e a programação de hoje serão preservadas. Não haverá novas ocorrências a partir de amanhã.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction disabled={write.isPending} onClick={e => { e.preventDefault(); if (archiving) void submit({ action: 'archive', habit: archiving }).then(() => setArchiving(null)).catch(() => {}); }}>Arquivar hábito</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
function HabitEditor({ habit, today, pending, onClose, onSave }: { habit: Habit | 'new'; today: string; pending: boolean; onClose: () => void; onSave: (command: HabitCommand) => Promise<unknown> }) {
  const existing = habit === 'new' ? null : habit;
  const [name, setName] = useState(existing?.name ?? ''), [days, setDays] = useState<string[]>((existing?.schedules.slice(-1)[0]?.weekdays ?? [1, 2, 3, 4, 5, 6, 7]).map(String));
  const [start, setStart] = useState(today), [end, setEnd] = useState(''), [error, setError] = useState(''), [submitted, setSubmitted] = useState(false);
  const key = useRef(crypto.randomUUID()), payload = useRef('');
  const valid = name.trim().length > 0 && name.trim().length <= 100 && days.length > 0 && (!!existing || (start >= today && (!end || end >= start)));
  return <Dialog open onOpenChange={next => { if (!next && !pending) onClose(); }}><DialogContent className="max-h-dialog overflow-y-auto"><DialogHeader><DialogTitle>{existing ? 'Editar hábito' : 'Novo hábito'}</DialogTitle><DialogDescription>{existing ? 'A nova frequência valerá a partir de amanhã; o histórico será preservado.' : 'Uma execução por dia programado. Sem registro de dias anteriores ao cadastro.'}</DialogDescription></DialogHeader>
    <form className="flex flex-col gap-4" onSubmit={async event => {
      event.preventDefault(); setSubmitted(true); setError(''); if (!valid) return;
      const input = { name: name.trim(), weekdays: days.map(Number), startDate: start, endDate: end || null };
      if (payload.current && payload.current !== JSON.stringify(input)) key.current = crypto.randomUUID(); payload.current = JSON.stringify(input);
      try { await onSave(existing ? { action: 'update', habit: existing, name: input.name, weekdays: input.weekdays } : { action: 'create', input, key: key.current }); onClose(); } catch (e) { setError(errorText(e)); }
    }}><FieldGroup><Field data-invalid={submitted && !name.trim()}><FieldLabel htmlFor="habit-name">Nome</FieldLabel><Input id="habit-name" autoFocus value={name} maxLength={100} aria-invalid={submitted && !name.trim()} onChange={e => setName(e.target.value)} /></Field>
      <Field data-invalid={submitted && days.length === 0}><FieldLabel id="habit-weekdays-label">Dias da semana</FieldLabel><ToggleGroup variant="outline" type="multiple" value={days} onValueChange={setDays} className="flex-wrap justify-start" aria-labelledby="habit-weekdays-label" aria-invalid={submitted && days.length === 0} disabled={pending}>{weekdays.map((label, i) => <ToggleGroupItem key={label} value={String(i + 1)} aria-label={label}>{label.slice(0, 3)}</ToggleGroupItem>)}</ToggleGroup>{submitted && days.length === 0 && <FieldDescription>Escolha pelo menos um dia.</FieldDescription>}</Field>
      {!existing && <><Field data-invalid={submitted && start < today}><FieldLabel htmlFor="habit-start">Começar em</FieldLabel><WorkDatePicker id="habit-start" label="Começar em" min={today} value={start} required onChange={setStart} invalid={submitted && start < today} /></Field><Field data-invalid={submitted && !!end && end < start}><FieldLabel htmlFor="habit-end">Terminar em (opcional)</FieldLabel><WorkDatePicker id="habit-end" label="Terminar em" min={start} value={end} onChange={setEnd} invalid={submitted && !!end && end < start} />{submitted && !!end && end < start && <FieldDescription>O término deve ser igual ou posterior ao início.</FieldDescription>}</Field></>}
    </FieldGroup>{error && <Alert><AlertDescription>{error}</AlertDescription></Alert>}<div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={pending} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? 'Salvando…' : 'Salvar hábito'}</Button></div></form>
  </DialogContent></Dialog>;
}
function PauseEditor({ habit, today, pending, onClose, onSave }: { habit: Habit; today: string; pending: boolean; onClose: () => void; onSave: (command: HabitCommand) => Promise<unknown> }) {
  const [start, setStart] = useState(habit.startDate > today ? habit.startDate : today), [end, setEnd] = useState(start), [error, setError] = useState('');
  const minStart = habit.startDate > today ? habit.startDate : today;
  const valid = !!start && !!end && start >= minStart && end >= start && (!habit.endDate || end <= habit.endDate);
  return <Dialog open onOpenChange={next => { if (!next && !pending) onClose(); }}><DialogContent><DialogHeader><DialogTitle>Pausar {habit.name}</DialogTitle><DialogDescription>Dias em pausa não entrarão nas ocorrências previstas. A programação retorna após o fim.</DialogDescription></DialogHeader><form className="flex flex-col gap-4" onSubmit={async e => { e.preventDefault(); if (!valid) { setError('Escolha um intervalo de pausa válido dentro da vigência do hábito.'); return; } try { await onSave({ action: 'pause', habit, startDate: start, endDate: end }); onClose(); } catch (e) { setError(errorText(e)); } }}><FieldGroup><Field><FieldLabel htmlFor="pause-start">Início da pausa</FieldLabel><WorkDatePicker id="pause-start" label="Início da pausa" required min={minStart} max={habit.endDate ?? undefined} value={start} onChange={setStart} /></Field><Field><FieldLabel htmlFor="pause-end">Fim da pausa</FieldLabel><WorkDatePicker id="pause-end" label="Fim da pausa" required min={start} max={habit.endDate ?? undefined} value={end} onChange={setEnd} /></Field></FieldGroup>{error && <Alert><AlertDescription>{error}</AlertDescription></Alert>}<div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={pending} onClick={onClose}>Cancelar</Button><Button disabled={pending}>{pending ? 'Salvando…' : 'Salvar pausa'}</Button></div></form></DialogContent></Dialog>;
}
