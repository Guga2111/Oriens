import { Maximize, PanelRight, SquareDot, type LucideIcon } from 'lucide-react';
import type { TaskView } from '@/types/settings';

/** How a task opens, in the order offered; the choice is a user preference kept by the API. */
export const TASK_VIEWS = [
  { value: 'peek', label: 'Painel lateral', icon: PanelRight },
  { value: 'modal', label: 'Modal', icon: SquareDot },
  { value: 'full', label: 'Tela cheia', icon: Maximize },
] as const satisfies readonly { value: TaskView; label: string; icon: LucideIcon }[];

export const DEFAULT_TASK_VIEW: TaskView = 'peek';
