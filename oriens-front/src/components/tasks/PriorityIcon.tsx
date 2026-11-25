import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/types/task";

const PRIORITY_BARS: Record<Exclude<TaskPriority, "URGENT">, { level: number; tone: string }> = {
  HIGH: { level: 3, tone: "text-priority-high" },
  MEDIUM: { level: 2, tone: "text-priority-medium" },
  LOW: { level: 1, tone: "text-priority-low" },
  NONE: { level: 0, tone: "text-muted-foreground" },
};

/** Plane-style priority mark: three rising bars over the full icon height; the first `level` are solid, the rest a tint of the same hue. Urgent is a filled alert square. */
export function PriorityIcon({ priority, className }: { priority: TaskPriority; className?: string }) {
  if (priority === "URGENT") return (
    <svg viewBox="0 0 12 12" aria-hidden className={cn("text-priority-urgent", className)}>
      <rect x="0.5" y="0.5" width="11" height="11" rx="2.5" className="fill-current" />
      <rect x="5.25" y="2.5" width="1.5" height="4.75" rx="0.75" className="fill-background" />
      <circle cx="6" cy="9.1" r="0.9" className="fill-background" />
    </svg>
  );
  const { level, tone } = PRIORITY_BARS[priority];
  return (
    <svg viewBox="0 0 12 12" aria-hidden className={cn(tone, className)}>
      {[{ x: 0.5, h: 5 }, { x: 4.75, h: 8 }, { x: 9, h: 11 }].map((bar, index) => (
        <rect key={bar.x} x={bar.x} y={11.5 - bar.h} width="2.5" height={bar.h} rx="0.75" className={cn("fill-current", index >= level && "opacity-25")} />
      ))}
    </svg>
  );
}
