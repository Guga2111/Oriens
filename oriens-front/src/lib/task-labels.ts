import type { BadgeProps } from '@/components/ui/badge';
import type { TaskLabelColor } from '@/types/task-label';
/** `variant` fills a label badge; `dot` is the label's strong tone for a dot beside its name. */
export const LABEL_COLORS: Record<TaskLabelColor, { name: string; variant: BadgeProps['variant']; dot: string }> = {
  RED: { name: 'Vermelho', variant: 'label-red', dot: 'bg-label-red-foreground' },
  ORANGE: { name: 'Laranja', variant: 'label-orange', dot: 'bg-label-orange-foreground' },
  YELLOW: { name: 'Amarelo', variant: 'label-yellow', dot: 'bg-label-yellow-foreground' },
  GREEN: { name: 'Verde', variant: 'label-green', dot: 'bg-label-green-foreground' },
  BLUE: { name: 'Azul', variant: 'label-blue', dot: 'bg-label-blue-foreground' },
  GRAY: { name: 'Cinza', variant: 'label-gray', dot: 'bg-label-gray-foreground' },
};
