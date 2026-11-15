import type { BadgeProps } from '@/components/ui/badge';
import type { TaskLabelColor } from '@/types/task-label';
export const LABEL_COLORS: Record<TaskLabelColor, { name: string; variant: BadgeProps['variant'] }> = {
  RED: { name: 'Vermelho', variant: 'label-red' }, ORANGE: { name: 'Laranja', variant: 'label-orange' },
  YELLOW: { name: 'Amarelo', variant: 'label-yellow' }, GREEN: { name: 'Verde', variant: 'label-green' },
  BLUE: { name: 'Azul', variant: 'label-blue' }, GRAY: { name: 'Cinza', variant: 'label-gray' },
};
