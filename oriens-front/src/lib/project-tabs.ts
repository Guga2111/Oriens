import { CalendarDays, ChartGantt, Kanban, LayoutDashboard, Layers2, List, Sheet, Target, type LucideIcon } from 'lucide-react';

/** How the work items of a project can be laid out, in plane.so's order. Only board and timeline exist so far. */
export const WORK_VIEWS = [
  { value: 'list', label: 'Lista', icon: List, ready: false },
  { value: 'board', label: 'Quadro', icon: Kanban, ready: true },
  { value: 'calendar', label: 'Calendário', icon: CalendarDays, ready: false },
  { value: 'table', label: 'Tabela', icon: Sheet, ready: false },
  { value: 'timeline', label: 'Timeline', icon: ChartGantt, ready: true },
] as const satisfies readonly { value: string; label: string; icon: LucideIcon; ready: boolean }[];
export type WorkView = typeof WORK_VIEWS[number]['value'];

/** The pages of a development project, as the sidebar lists them. "Itens de trabalho" holds every view. */
export const PROJECT_SECTIONS = [
  { value: 'overview', label: 'Panorama', icon: LayoutDashboard },
  { value: 'work', label: 'Itens de trabalho', icon: Layers2 },
  { value: 'objectives', label: 'Objetivos', icon: Target },
] as const satisfies readonly { value: string; label: string; icon: LucideIcon }[];
export type ProjectSection = typeof PROJECT_SECTIONS[number]['value'];

/** `?tab=` names either a section or, for the work items, the view they are shown in. */
export type ProjectTab = Exclude<ProjectSection, 'work'> | WorkView;

const isWorkView = (value: string | null): value is WorkView => WORK_VIEWS.some(view => view.value === value);

/** The project page tab named by `?tab=`; unknown or missing values open the work items on the board. */
export const projectTabFrom = (value: string | null): ProjectTab =>
  value === 'overview' || value === 'objectives' || isWorkView(value) ? value : 'board';

export const projectSectionOf = (tab: ProjectTab): ProjectSection => tab === 'overview' || tab === 'objectives' ? tab : 'work';

export const workViewOf = (tab: ProjectTab): WorkView | null => isWorkView(tab) ? tab : null;
