import { Circle, CircleCheck, CircleDashed, CircleDot, CircleX, type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types/task";

/** plane.so's state icons: a dashed circle in the backlog, an open circle to do, an amber ring in progress, filled green done and filled red cancelled. */
const STATE_ICONS: Record<TaskStatus, { icon: typeof Circle; className: string }> = {
  BACKLOG: { icon: CircleDashed, className: "text-muted-foreground" },
  PENDING: { icon: Circle, className: "text-muted-foreground" },
  ON_DOING: { icon: CircleDot, className: "text-state-started" },
  // The white stroke draws the check and the cross on the filled disc.
  CONCLUDED: { icon: CircleCheck, className: "fill-state-completed text-card" },
  CANCELLED: { icon: CircleX, className: "fill-state-cancelled text-card" },
};

/** The icon of a task state or of a board column's kind; decorative unless given a label. */
export function StatusIcon({ status, className, ...props }: { status: TaskStatus } & LucideProps) {
  const { icon: Icon, className: tone } = STATE_ICONS[status];
  return <Icon aria-hidden={props["aria-label"] ? undefined : true} {...props} className={cn("shrink-0", tone, className)} />;
}
