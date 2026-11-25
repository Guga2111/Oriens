import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, format, subYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useProductToday } from '@/hooks/useProductToday';
import { useActivity, useHabitStatistics } from '@/hooks/useStatistics';
import { productDate, productNow } from '@/lib/product-time';
import { dateKey } from '@/lib/statistics';
import { ActivityCalendar } from '@/components/statistics/ActivityCalendar';
import { StatisticsEvidence, type Evidence } from '@/components/statistics/StatisticsEvidence';
import { QuickLinks } from '@/components/home/QuickLinks';
import { RecentItems } from '@/components/home/RecentItems';
import { TaskPeek } from '@/components/tasks/TaskPeek';
import { TaskEditor } from '@/components/tasks/TaskEditor';
import type { WorkTask } from '@/types/work';

export function WorkHomePage() {
  const { username } = useAuth();
  const today = useProductToday();
  const [end, setEnd] = useState(today);
  const oldToday = useRef(today);
  useEffect(() => {
    setEnd(previous => previous === oldToday.current ? today : previous);
    oldToday.current = today;
  }, [today]);
  const period = useMemo(() => ({ startDate: dateKey(addDays(subYears(productDate(end), 1), 1)), endDate: end }), [end]);
  const tasks = useActivity(period);
  const habits = useHabitStatistics(period);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const opener = useRef<HTMLElement>(null);
  const [params, setParams] = useSearchParams();
  const taskId = Number(params.get('task'));
  const [editing, setEditing] = useState<WorkTask | null>(null);
  const hour = Number(productNow().time.slice(0, 2));
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = username?.trim().split(/\s+/)[0];
  function openTask(id: number | null) {
    setParams(previous => { const next = new URLSearchParams(previous); if (id) next.set('task', String(id)); else next.delete('task'); return next; }, { replace: true });
  }
  return <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-10 pb-8 lg:px-8 xl:px-12">
    <header className="flex flex-col items-center gap-2 pb-2 pt-4 text-center">
      <h1 className="text-xl font-semibold">{greeting}{firstName ? `, ${firstName}` : ''}</h1>
      <p className="text-sm text-muted-foreground">{format(productDate(today), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
    </header>
    <ActivityCalendar period={period} today={today} tasks={tasks} habits={habits} onWindowChange={setEnd}
      onSelect={(date, trigger) => { opener.current = trigger; setEvidence({ kind: 'day', period: { startDate: date, endDate: date } }); }} />
    <QuickLinks />
    <RecentItems onOpenTask={openTask} />
    {evidence && <StatisticsEvidence key={JSON.stringify(evidence)} selection={evidence} onClose={() => setEvidence(null)} opener={opener} />}
    {Number.isSafeInteger(taskId) && taskId > 0 && <TaskPeek taskId={taskId} onClose={() => openTask(null)} onEdit={task => { openTask(null); setEditing(task); }} />}
    {editing && <TaskEditor open task={editing} onOpenChange={open => { if (!open) setEditing(null); }} />}
  </div>;
}
