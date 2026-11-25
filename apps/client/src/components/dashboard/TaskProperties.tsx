import { forwardRef, useCallback, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { isOpenStatus } from "@/lib/tasks";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Archive, CalendarClock, CalendarDays, Check, CircleDot, Clock, Folder, MapPin, Tag, Target, TriangleAlert,
} from "lucide-react";
import { TimeColumnsPicker } from "@/components/common/TimeColumnsPicker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PriorityIcon } from "@/components/tasks/PriorityIcon";
import { useTaskLabels } from "@/hooks/useTaskLabels";
import { useProductToday } from "@/hooks/useProductToday";
import { parseLocalDate } from "@/lib/date";
import { PRIORITY, PRIORITY_ORDER } from "@/lib/labels";
import { productDate, productNow } from "@/lib/product-time";
import { HALF_HOURS, nextHalfHour, parseTimeOfDay } from "@/lib/time-of-day";
import { LABEL_COLORS } from "@/lib/task-labels";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";
import type { TaskPatch } from "@/types/work";

/** Saves the given fields; resolves `true` when the task was saved. */
export type SaveTask = (body: Partial<TaskPatch>) => Promise<boolean>;

const chip = "inline-flex h-6 flex-none items-center gap-1 whitespace-nowrap rounded-md border border-border px-2 text-xs font-normal text-foreground [&_svg]:size-3 [&_svg]:shrink-0";

/** A read-only property: icon and short value; `label` is the full reading for the tooltip. */
function Property({ label, icon, iconClassName, className, children }: {
  label: string; icon: ReactNode; iconClassName?: string; className?: string; children: ReactNode;
}) {
  return (
    <span className={cn(chip, className)} title={label}>
      <span aria-hidden className={cn("flex text-muted-foreground", iconClassName)}>{icon}</span>
      {children}
    </span>
  );
}

type ChipButtonProps = ComponentPropsWithoutRef<typeof Button> & {
  label: string; icon: ReactNode; iconClassName?: string; chipClassName?: string; iconOnly?: boolean;
  /** Borderless and roomier: how the task panel lays properties out in a strip. */
  bare?: boolean;
};

/** Chip look shared by the list row (bordered) and the task panel (`bare`). */
const BARE = "h-7 border-transparent px-1.5 text-sm [&_svg]:size-3.5";

/**
 * An editable property. The planning screen keeps a 44px touch target on phones, so the button is a
 * transparent hit area with negative margins and the chip drawn inside keeps its 24px size.
 * An icon-only chip (an empty field, the map) names itself in a tooltip, since it shows no words.
 */
const ChipButton = forwardRef<HTMLButtonElement, ChipButtonProps>(
  ({ label, icon, iconClassName, chipClassName, iconOnly = false, bare = false, children, className, ...props }, ref) => {
    const button = (
      <Button
        ref={ref}
        type="button"
        variant="ghost"
        title={iconOnly ? undefined : label}
        aria-label={label}
        className={cn("group/chip h-6 w-auto p-0 hover:bg-transparent max-md:-my-2.5 [&_svg]:size-3", bare && "h-7 [&_svg]:size-3.5", iconOnly && "max-md:-mx-2.5", className)}
        {...props}
      >
        <span className={cn(chip, "group-hover/chip:bg-accent group-data-[state=open]/chip:bg-accent", bare && BARE, iconOnly && "w-6 justify-center px-0", bare && iconOnly && "w-7", chipClassName)}>
          <span aria-hidden className={cn("flex text-muted-foreground", iconClassName)}>{icon}</span>
          {children}
        </span>
      </Button>
    );
    if (!iconOnly) return button;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent className="px-2 py-1 text-xs">{label}</TooltipContent>
      </Tooltip>
    );
  },
);
ChipButton.displayName = "ChipButton";

const shortDate = (value: string) => format(parseISO(value), "dd/MM/yyyy");

/** Calendar popover for one date field; the footer clears the field. */
export function DateProperty({ trigger, value, label, clearLabel, onPick, onClear, disabled }: {
  trigger: ReactNode; value: string | null | undefined; label: string; clearLabel: string;
  onPick: (value: string) => Promise<boolean>; onClear: () => Promise<boolean>; disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const today = productDate(useProductToday());
  const date = parseLocalDate(value ?? "");
  const run = async (save: () => Promise<boolean>) => { if (await save()) setOpen(false); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0" aria-label={label}>
        <Calendar mode="single" selected={date} defaultMonth={date ?? today} today={today} locale={ptBR} initialFocus
          labels={{ labelPrevious: () => "Mês anterior", labelNext: () => "Próximo mês" }}
          onSelect={next => { if (next) void run(() => onPick(format(next, "yyyy-MM-dd"))); }} />
        {value && (
          <div className="border-t p-2">
            <Button type="button" variant="ghost" size="sm" className="w-full justify-start" disabled={disabled} onClick={() => void run(onClear)}>{clearLabel}</Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * The time list: every half hour, or the one time read from what was typed (`9h30`, `930`, `14:00`).
 * Enter takes the highlighted time; the footer clears the field, as in the date popovers.
 */
function TimeOptions({ current, disabled, onPick }: { current: string; disabled: boolean; onPick: (time: string | null) => void }) {
  const [query, setQuery] = useState("");
  const typing = query.trim() !== "";
  const typed = typing ? parseTimeOfDay(query) : null;
  const options = typing ? (typed ? [typed] : []) : current && !HALF_HOURS.includes(current) ? [...HALF_HOURS, current].sort() : HALF_HOURS;
  const initial = current || nextHalfHour(productNow().time);
  // Scrolls before the first paint, so the list opens already on the highlighted time instead of sliding to it.
  const openOnInitial = useCallback((list: HTMLDivElement | null) => {
    const item = list?.querySelector<HTMLElement>(`[cmdk-item][data-value="${initial}"]`);
    if (list && item) list.scrollTop = item.offsetTop - (list.clientHeight - item.offsetHeight) / 2;
  }, [initial]);
  return (
    <Command shouldFilter={false} defaultValue={initial} label="Horário">
      <CommandInput value={query} onValueChange={setQuery} placeholder="Ex.: 9h30, 1430"
        actions={<TimeColumnsPicker value={typed ?? initial} onPick={onPick} disabled={disabled} />} />
      <CommandList ref={openOnInitial} label="Horários" className="relative max-h-56">
        <CommandEmpty className="px-3 py-3 text-sm text-muted-foreground">Não reconheci. Tente 9h30 ou 14:00.</CommandEmpty>
        <CommandGroup>
          {options.map(time => (
            <CommandItem key={time} value={time} disabled={disabled} className="tabular-nums" onSelect={() => onPick(time)}>
              {time}
              {time === current && <><Check aria-hidden className="ml-auto size-3.5" /><span className="sr-only"> (atual)</span></>}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      {current && (
        <div className="border-t p-1">
          <Button type="button" variant="ghost" size="sm" className="w-full justify-start px-2" disabled={disabled} onClick={() => onPick(null)}>Remover horário</Button>
        </div>
      )}
    </Command>
  );
}

export function TimeProperty({ task, onSave, disabled, bare = false }: { task: Task; onSave: SaveTask; disabled: boolean; bare?: boolean }) {
  const current = task.startTime?.slice(0, 5) ?? "";
  const [open, setOpen] = useState(false);
  const pick = async (time: string | null) => {
    if ((time ?? "") === current || await onSave({ startTime: time && `${time}:00` })) setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {current ? (
          <ChipButton label={`Horário ${current}`} icon={<Clock />} chipClassName="tabular-nums" bare={bare}>
            {current}
          </ChipButton>
        ) : (
          bare ? <ChipButton label="Definir horário" icon={<Clock />} bare chipClassName="text-muted-foreground">Definir horário</ChipButton>
            : <ChipButton label="Definir horário" icon={<Clock />} iconOnly />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-0" aria-label="Horário">
        {task.plannedDate
          ? <TimeOptions current={current} disabled={disabled} onPick={time => void pick(time)} />
          : <p className="p-3 text-sm text-muted-foreground">Planeje um dia antes de definir o horário.</p>}
      </PopoverContent>
    </Popover>
  );
}

export function PriorityProperty({ task, onSave, disabled, bare = false }: { task: Task; onSave: SaveTask; disabled: boolean; bare?: boolean }) {
  const [open, setOpen] = useState(false);
  const priority = PRIORITY[task.priority];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <ChipButton label={task.priority === "NONE" ? priority.label : `Prioridade ${priority.label.toLowerCase()}`} icon={<PriorityIcon priority={task.priority} />} bare={bare}>
          {priority.label}
        </ChipButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-0">
        <Command aria-label="Prioridade">
          <CommandList>
            <CommandGroup>
              {PRIORITY_ORDER.map(value => (
                <CommandItem key={value} value={PRIORITY[value].label} disabled={disabled}
                  onSelect={async () => { if (value === task.priority || await onSave({ priority: value })) setOpen(false); }}>
                  <span aria-hidden className="flex [&_svg]:size-3"><PriorityIcon priority={value} /></span>
                  {PRIORITY[value].label}
                  {value === task.priority && <><Check aria-hidden className="ml-auto size-3.5" /><span className="sr-only">(atual)</span></>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function LabelsProperty({ task, onSave, disabled, bare = false }: { task: Task; onSave: SaveTask; disabled: boolean; bare?: boolean }) {
  const catalog = useTaskLabels();
  const labels = task.labels ?? [];
  const selected = labels.map(label => label.id);
  const toggle = (id: number) => onSave({ labelIds: (selected.includes(id) ? selected.filter(current => current !== id) : [...selected, id]).sort((a, b) => a - b) });
  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        {labels.length ? (
          <Button type="button" variant="ghost" title={`Etiquetas: ${labels.map(label => label.name).join(", ")}`}
            aria-label={`Etiquetas: ${labels.map(label => label.name).join(", ")}`}
            className="group/chip h-6 w-auto gap-1.5 p-0 font-normal hover:bg-transparent max-md:-my-2.5">
            {labels.map(label => (
              <span key={label.id} className={cn(chip, "max-w-40 group-hover/chip:bg-accent group-data-[state=open]/chip:bg-accent")}>
                <span aria-hidden className={cn("size-2 shrink-0 rounded-full", LABEL_COLORS[label.color]?.dot ?? "bg-muted-foreground")} />
                <span className="truncate">{label.name}</span>
              </span>
            ))}
          </Button>
        ) : (
          bare ? <ChipButton label="Adicionar etiquetas" icon={<Tag />} bare chipClassName="text-muted-foreground">Adicionar etiquetas</ChipButton>
            : <ChipButton label="Adicionar etiquetas" icon={<Tag />} iconOnly />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-0">
        <Command aria-label="Etiquetas">
          <CommandInput placeholder="Buscar etiqueta" aria-label="Buscar etiqueta" />
          <CommandList>
            <CommandEmpty>{catalog.isPending ? "Carregando…" : "Nenhuma etiqueta. Crie pela edição da tarefa."}</CommandEmpty>
            <CommandGroup>
              {(catalog.data ?? []).map(label => (
                <CommandItem key={label.id} value={`${label.name} ${label.id}`} disabled={disabled} onSelect={() => void toggle(label.id)}>
                  <span aria-hidden className={cn("size-2 shrink-0 rounded-full", LABEL_COLORS[label.color]?.dot ?? "bg-muted-foreground")} />
                  <span className="truncate">{label.name}</span>
                  {selected.includes(label.id) && <><Check aria-hidden className="ml-auto size-3.5" /><span className="sr-only">(selecionada)</span></>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function PlannedProperty({ task, onSave, disabled, bare = false }: { task: Task; onSave: SaveTask; disabled: boolean; bare?: boolean }) {
  const today = useProductToday();
  const plannedLabel = task.plannedDate === today ? "hoje" : task.plannedDate ? shortDate(task.plannedDate) : "";
  return (
    <DateProperty
      value={task.plannedDate} label="Dia planejado" clearLabel="Remover planejamento" disabled={disabled}
      onPick={plannedDate => onSave({ plannedDate })}
      onClear={() => onSave({ plannedDate: null, startTime: null })}
      trigger={plannedLabel ? (
        <ChipButton label={`Planejada para ${plannedLabel}`} icon={<CalendarDays />} chipClassName="tabular-nums" bare={bare}>
          {plannedLabel === "hoje" ? "Hoje" : plannedLabel}
        </ChipButton>
      ) : (
        <ChipButton label="Sem planejamento" icon={<CalendarDays />} chipClassName="text-muted-foreground" bare={bare}>Sem planejamento</ChipButton>
      )}
    />
  );
}

export function DueProperty({ task, onSave, disabled, bare = false }: { task: Task; onSave: SaveTask; disabled: boolean; bare?: boolean }) {
  const today = useProductToday();
  const active = isOpenStatus(task.status);
  const overdue = active && !!task.dueDate && task.dueDate < today;
  const dueToday = active && task.dueDate === today;
  const dueLabel = overdue ? "Prazo ultrapassado: " : dueToday ? "Prazo termina hoje: " : "Prazo: ";
  return (
    <DateProperty
      value={task.dueDate} label="Prazo final" clearLabel="Remover prazo" disabled={disabled}
      onPick={dueDate => onSave({ dueDate })}
      onClear={() => onSave({ dueDate: null })}
      trigger={task.dueDate ? (
        <ChipButton
          label={`${dueLabel}${shortDate(task.dueDate)}`}
          icon={overdue ? <TriangleAlert /> : <CalendarClock />}
          iconClassName={overdue ? "text-negative" : dueToday ? "text-now" : undefined}
          chipClassName={cn("tabular-nums", overdue && "text-negative")}
          bare={bare}
        >
          {shortDate(task.dueDate)}
        </ChipButton>
      ) : bare ? (
        <ChipButton label="Definir prazo" icon={<CalendarClock />} bare chipClassName="text-muted-foreground">Prazo</ChipButton>
      ) : (
        <ChipButton label="Definir prazo" icon={<CalendarClock />} iconOnly />
      )}
    />
  );
}

/**
 * Task properties as Plane-style chips. Priority, time, planned day, deadline and labels open a popover
 * that saves on choice; project and objective stay links; the pin opens the map.
 */
export function TaskProperties({ task, onSave, onOpenMap, disabled }: {
  task: Task; onSave: SaveTask; onOpenMap: () => void; disabled: boolean;
}) {
  return (
    <div className="pointer-events-none relative z-10 flex min-w-0 flex-wrap items-center justify-end gap-1.5 [&>*]:pointer-events-auto max-md:order-last max-md:basis-full max-md:justify-start max-md:pl-9">
      {task.status === "ON_DOING" && <Property label="Em andamento" icon={<CircleDot />} iconClassName="text-now">Em andamento</Property>}
      <PriorityProperty task={task} onSave={onSave} disabled={disabled} />
      <TimeProperty task={task} onSave={onSave} disabled={disabled} />
      <PlannedProperty task={task} onSave={onSave} disabled={disabled} />
      <DueProperty task={task} onSave={onSave} disabled={disabled} />
      <LabelsProperty task={task} onSave={onSave} disabled={disabled} />
      {task.project && (
        <span className={cn(chip, "max-w-56")} title={task.project.archived ? `${task.project.title} · Projeto arquivado` : task.project.title}>
          {task.project.archived ? <Archive aria-hidden className="text-muted-foreground" /> : <Folder aria-hidden className="text-muted-foreground" />}
          <Link className="truncate hover:underline" to={`/tasks/project/${task.project.id}`}>{task.project.title}</Link>
          {task.column && <span className="shrink-0 text-muted-foreground">· {task.column.name}</span>}
          {task.project.archived && <span className="sr-only"> · Projeto arquivado</span>}
        </span>
      )}
      {task.project && task.objective && (
        <span className={cn(chip, "max-w-56")} title={task.objective.title}>
          <Target aria-hidden className="text-muted-foreground" />
          <Link className="truncate hover:underline" to={`/tasks/project/${task.project.id}?tab=objectives#objective-${task.objective.id}`}>{task.objective.title}</Link>
        </span>
      )}
      {task.location?.address && (
        <ChipButton label={`Ver no mapa: ${task.location.address}`} icon={<MapPin />} iconOnly onClick={onOpenMap} />
      )}
    </div>
  );
}
