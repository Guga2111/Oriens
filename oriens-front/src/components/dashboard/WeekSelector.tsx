import { cn } from "@/lib/utils";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WeekSelectorProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

export function WeekSelector({ currentDate, setCurrentDate }: WeekSelectorProps) {
  const weekStart = startOfWeek(currentDate, { locale: ptBR });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  return (
    <div className="grid grid-cols-7 gap-2 rounded-lg bg-muted p-1">
      {weekDays.map(day => (
        <div
          key={day.toString()}
          className={cn(
            "flex h-auto flex-col rounded-md p-2 text-center", 
            isSameDay(day, currentDate) 
              ? "bg-gradient-primary text-primary-foreground shadow" 
              : "text-foreground"
          )}
        >
          <span className={cn(
            "text-xs capitalize",
            !isSameDay(day, currentDate) && "text-muted-foreground" 
          )}>
            {format(day, 'EEE', { locale: ptBR })}
          </span>
          <span className="text-lg font-bold">
            {format(day, 'dd')}
          </span>
        </div>
      ))}
    </div>
  );
}