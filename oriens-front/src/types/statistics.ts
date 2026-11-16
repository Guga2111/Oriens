import type { Page, EntryDTO } from './financial';

export interface Interval { startDate: string; endDate: string }
export interface AnalysisPeriod extends Interval { previousStartDate: string; previousEndDate: string; today: string; timezone: string; partial: boolean }
export interface DayCount { date: string; completed: number }
export interface ActivityStreakData { today: string; days: number | null; startDate: string | null; throughDate: string | null; lowerBound: boolean; coverageFrom: string }
export interface ActivityData { period: AnalysisPeriod; coverageFrom: string; total: number; previousTotal: number; days: DayCount[]; previousDays: DayCount[] }
export interface PlanCounts { planned: number; completed: number }
export interface PlanningData { period: AnalysisPeriod; current: PlanCounts; previous: PlanCounts; overdue: number; overdueByProject: { projectId: number | null; title: string; total: number }[] }
export interface TaskEvidence { id: number; title: string; completedAt: string | null; plannedDate: string | null; dueDate: string | null; status: string; projectId: number | null; projectTitle: string | null }
export type MoneyAmount = string;
export interface Money { income: MoneyAmount; expenses: MoneyAmount; result: MoneyAmount; entries: number }
export interface MoneyDay { date: string; income: MoneyAmount; expenses: MoneyAmount }
export interface CategoryTotal { tagId: number; name: string; amount: MoneyAmount; entries: number }
export interface FinanceData { period: AnalysisPeriod; current: Money; previous: Money; days: MoneyDay[]; categories: CategoryTotal[]; automaticEntries: number }
export type HabitState = 'DONE' | 'PENDING' | 'MISSED' | 'OFF' | 'PAUSED' | 'OUTSIDE';
export interface HabitSchedule { startDate: string; endDate: string | null; weekdays: number[] }
export interface HabitDay { date: string; state: HabitState }
export interface Habit { id: number; name: string; createdOn: string; startDate: string; endDate: string | null; archivedOn: string | null; version: number; schedules: HabitSchedule[]; pauses: Interval[]; days: HabitDay[]; completed: number; expected: number; previousCompleted: number; previousExpected: number }
export interface HabitsData { period: AnalysisPeriod; coverageFrom: string; habits: Habit[]; days: DayCount[]; previousDays: DayCount[]; completed: number; expected: number; previousCompleted: number; previousExpected: number }
export interface HabitInput { name: string; weekdays: number[]; startDate: string; endDate: string | null }
export type HabitCommand =
  | { action: 'create'; input: HabitInput; key: string }
  | { action: 'update'; habit: Habit; name: string; weekdays: number[] }
  | { action: 'execution'; habit: Habit; date: string; completed: boolean }
  | { action: 'pause'; habit: Habit; startDate: string; endDate: string }
  | { action: 'archive'; habit: Habit };
export interface ActivityCell { date: string; tasks: number | null; habits: number | null; total: number; covered: boolean; partial: boolean; future: boolean }
export type TaskEvidencePage = Page<TaskEvidence>;
export type FinancialEvidencePage = Page<EntryDTO>;

// Legacy dashboard contract, retained for older consumers.
export interface ChartDataPoint {
  date: string;       
  completed: number;  
}

export interface KpiData {
  value: number;
  change: number | null;
  description: string;
  additionalDescription: string;
}

export interface DashboardKpis {
  completedTasks: KpiData;
  productivityRate: KpiData;
  overdueTasks: KpiData;
  activeProjects: KpiData;
}

export interface DashboardData {
  kpi: {
    kpis: DashboardKpis;
  };
  charts: {
    tasksCompletedByTimeRangeDTOS: ChartDataPoint[];
  };
}
