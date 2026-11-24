import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { isAxiosError } from "axios";
import {
  ArrowRight, CalendarCheck, CalendarPlus, Check, ChevronDown, Circle, Columns3, Folder,
  Link2, MapPin, MoreHorizontal, Pencil, Tag, Target, Trash2, X,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { InlineText } from "@/components/common/InlineText";
import { WorkFeedback } from "@/components/common/WorkFeedback";
import {
  DueProperty, LabelsProperty, PlannedProperty, PriorityProperty, TimeProperty, type SaveTask,
} from "@/components/dashboard/TaskProperties";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusIcon } from "@/components/tasks/StatusIcon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSettings } from "@/context/SettingsContext";
import { useTaskActions } from "@/hooks/useTaskActions";
import { useProjectBoard, useTaskDetail } from "@/hooks/useWork";
import { formatLongDate } from "@/lib/date";
import { isEditingInline } from "@/lib/inline-edit";
import { DEFAULT_TASK_VIEW, TASK_VIEWS } from "@/lib/task-view";
import { TASK_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { TaskView } from "@/types/settings";
import type { TaskStatus } from "@/types/task";
import type { WorkTask } from "@/types/work";

/** A standalone task moves between these; a project task's state comes from its board column. */
const STANDALONE_STATUSES: TaskStatus[] = ["PENDING", "ON_DOING", "CONCLUDED"];

// Dividers separate the strip on wider panels; on a phone it wraps, so spacing replaces them.
const strip = "flex items-center pr-3 sm:border-l sm:border-border sm:px-2 sm:first:border-l-0 sm:first:pl-0";

function StatusProperty({ task, onSave, disabled }: { task: WorkTask; onSave: SaveTask; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const label = task.column?.name ?? TASK_STATUS[task.status].label;
  const face = (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-sm">
      <StatusIcon status={task.status} className="size-3.5" />{label}
    </span>
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button type="button" variant="ghost" aria-label={`Estado: ${label}`} className="h-7 p-0 font-normal hover:bg-accent data-[state=open]:bg-accent">{face}</Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-0">
        <Command aria-label="Estado">
          <CommandList>
            <CommandGroup>
              {STANDALONE_STATUSES.map(status => {
                return (
                  <CommandItem key={status} value={TASK_STATUS[status].label} disabled={disabled}
                    onSelect={async () => { if (status === task.status || await onSave({ status })) setOpen(false); }}>
                    <StatusIcon status={status} className="size-3.5" />
                    {TASK_STATUS[status].label}
                    {status === task.status && <><Check aria-hidden className="ml-auto size-3.5" /><span className="sr-only">(atual)</span></>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** A project task's state is its board column, so picking a column moves the task to the end of it. */
function ColumnProperty({ task, onSave, disabled, name, className }: { task: WorkTask; onSave: SaveTask; disabled: boolean; name: string; className?: string }) {
  const [open, setOpen] = useState(false);
  // The columns are fetched only once the picker opens; the board query is shared with the project page.
  const board = useProjectBoard(open ? task.projectId ?? 0 : 0);
  const label = task.column?.name ?? TASK_STATUS[task.status].label;
  const archived = !!task.project?.archived;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled || archived}>
        <Button type="button" variant="ghost" aria-label={`${name}: ${label}`} title={archived ? "Projeto arquivado: reative-o para mover a tarefa." : undefined}
          className={cn("h-7 gap-1.5 px-1.5 text-sm font-normal hover:bg-accent disabled:opacity-100 data-[state=open]:bg-accent", className)}>
          <StatusIcon status={task.status} className="size-3.5" />{label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        <Command aria-label="Coluna">
          <CommandList>
            {board.isPending ? <p className="px-3 py-2 text-xs text-muted-foreground">Carregando colunas…</p>
              : board.isError ? <p className="px-3 py-2 text-xs text-destructive">Não foi possível carregar as colunas.</p>
              : (
                <CommandGroup>
                  {board.data.columns.map(column => {
                    const current = column.id === task.columnId;
                    return (
                      <CommandItem key={column.id} value={`${column.name} ${column.id}`} disabled={disabled}
                        onSelect={async () => { if (current || await onSave({ columnId: column.id, beforeTaskId: null })) setOpen(false); }}>
                        <StatusIcon status={column.kind} className="size-3.5" />
                        <span className="truncate">{column.name}</span>
                        {current && <><Check aria-hidden className="ml-auto size-3.5" /><span className="sr-only">(atual)</span></>}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Collapsible defaultOpen className="group/section flex flex-col gap-1">
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" className="h-7 w-fit gap-1 px-0 text-xs font-medium hover:bg-transparent">
          {title}<ChevronDown aria-hidden className="size-3 transition-transform group-data-[state=closed]/section:-rotate-90 motion-reduce:transition-none" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <dl className="grid grid-cols-task-details items-center gap-x-6 gap-y-1 text-sm">{children}</dl>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof Circle; label: string; children: ReactNode }) {
  return (
    <>
      <dt className="flex h-8 items-center gap-2 text-muted-foreground"><Icon aria-hidden className="size-3.5 shrink-0" />{label}</dt>
      <dd className="flex min-h-8 min-w-0 items-center">{children}</dd>
    </>
  );
}

const empty = <span className="text-muted-foreground">—</span>;

function PeekBody({ task, onSave, disabled }: { task: WorkTask; onSave: SaveTask; disabled: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-y-1" aria-label="Propriedades principais" role="group">
          <div className={strip}>{task.projectId
            ? <ColumnProperty task={task} onSave={onSave} disabled={disabled} name="Estado" />
            : <StatusProperty task={task} onSave={onSave} disabled={disabled} />}</div>
          <div className={strip}><PriorityProperty task={task} onSave={onSave} disabled={disabled} bare /></div>
          <div className={strip}><PlannedProperty task={task} onSave={onSave} disabled={disabled} bare /></div>
          <div className={strip}><TimeProperty task={task} onSave={onSave} disabled={disabled} bare /></div>
          <div className={strip}><DueProperty task={task} onSave={onSave} disabled={disabled} bare /></div>
        </div>
        <InlineText multiline value={task.description ?? ""} label="Descrição" placeholder="Adicionar descrição…" maxLength={10000}
          className="text-sm leading-relaxed" onCommit={description => onSave({ description: description || null })} />
      </div>

      <section aria-labelledby="task-peek-properties" className="flex flex-col gap-4">
        <h3 id="task-peek-properties" className="text-sm font-medium">Propriedades</h3>
        <Section title="Detalhes">
          <Row icon={Tag} label="Etiquetas"><LabelsProperty task={task} onSave={onSave} disabled={disabled} bare /></Row>
          <Row icon={MapPin} label="Localização">{task.location?.address ? <span className="break-words">{task.location.address}</span> : empty}</Row>
        </Section>
        {task.project && (
          <Section title="Estrutura do projeto">
            <Row icon={Folder} label="Projeto"><Link className="truncate hover:underline" to={`/tasks/project/${task.project.id}`}>{task.project.title}</Link></Row>
            <Row icon={Columns3} label="Coluna"><ColumnProperty task={task} onSave={onSave} disabled={disabled} name="Coluna" className="-ml-1.5" /></Row>
            <Row icon={Target} label="Objetivo">{task.objective
              ? <Link className="truncate hover:underline" to={`/tasks/project/${task.project.id}?tab=objectives#objective-${task.objective.id}`}>{task.objective.title}</Link>
              : empty}</Row>
          </Section>
        )}
      </section>

      <ul aria-label="Histórico" className="flex flex-col gap-2 text-xs text-muted-foreground">
        <li className="flex items-center gap-2"><CalendarPlus aria-hidden className="size-3.5" />Criada em {formatLongDate(task.createdAt)}</li>
        {task.completedAt && <li className="flex items-center gap-2"><CalendarCheck aria-hidden className="size-3.5" />Concluída em {formatLongDate(task.completedAt)}</li>}
      </ul>
    </div>
  );
}

/** The task view is a user preference kept by the API, shared with Configurações › Aparência. */
function useTaskView() {
  const { preferences, updatePreference } = useSettings();
  const view: TaskView = preferences?.taskView ?? DEFAULT_TASK_VIEW;
  // A failed save is reported by the settings context and the previous view comes back.
  const choose = (next: TaskView) => { if (next !== view) void updatePreference("taskView", next).catch(() => {}); };
  return [view, choose] as const;
}

function ViewModeMenu({ mode, onChange }: { mode: TaskView; onChange: (mode: TaskView) => void }) {
  const current = TASK_VIEWS.find(view => view.value === mode)!;
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label={`Modo de visualização: ${current.label}`}><current.icon aria-hidden /></Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent className="px-2 py-1 text-xs">Modo de visualização</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuRadioGroup value={mode} onValueChange={next => onChange(next as TaskView)}>
          {TASK_VIEWS.map(view => (
            <DropdownMenuRadioItem key={view.value} value={view.value}>
              <view.icon aria-hidden className="text-muted-foreground" />{view.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Escape first leaves a field being edited (restoring its text) and only then closes the task. */
const keepOpenWhileEditing = (event: KeyboardEvent) => { if (isEditingInline()) event.preventDefault(); };

/**
 * Plane-style task view, shown as a side panel next to the list (the list stays usable and a click outside
 * closes it), a modal or the full screen, as the viewer chooses. Title and description are edited in place and
 * the properties through the same popovers as the row; the full editor stays behind "Editar".
 */
export function TaskPeek({ taskId, placeholder, onClose, onEdit }: {
  taskId: number; placeholder?: WorkTask; onClose: () => void; onEdit: (task: WorkTask) => void;
}) {
  const detail = useTaskDetail(taskId, placeholder);
  const actions = useTaskActions();
  const [mode, setMode] = useTaskView();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const task = detail.data;
  const missing = isAxiosError(detail.error) && detail.error.response?.status === 404;

  const save: SaveTask = async body => {
    if (!task) return false;
    setSaving(true);
    try { await actions.update(task, body); return true; }
    catch { return false; /* The panel shows the failure above its content. */ }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!task) return false;
    try { await actions.remove(task); onClose(); return true; }
    catch { return false; }
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast.success("Link da tarefa copiado."); }
    catch { toast.error("Não foi possível copiar o link."); }
  };
  const onOpenChange = (open: boolean) => { if (!open) onClose(); };

  const content = (
    <>
      <div className="flex h-app-header shrink-0 items-center justify-between gap-2 border-b px-4">
        <div className="flex items-center gap-1">
          <SheetClose asChild>
            <Button type="button" variant="ghost" size="icon" aria-label="Fechar painel">{mode === "peek" ? <ArrowRight aria-hidden /> : <X aria-hidden />}</Button>
          </SheetClose>
          <ViewModeMenu mode={mode} onChange={setMode} />
        </div>
        {task && (
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" aria-label="Copiar link da tarefa" onClick={() => void copyLink()}><Link2 aria-hidden /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" aria-label={`Ações da tarefa ${task.title}`} disabled={saving}><MoreHorizontal aria-hidden /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(task)}><Pencil aria-hidden />Editar</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleting(true)}><Trash2 aria-hidden />Excluir</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className={cn("mx-auto flex w-full flex-col", mode === "full" && "max-w-4xl")}>
          {task ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">{task.project?.title ?? "Tarefa avulsa"} · #{task.id}</p>
              {/* The dialog keeps the saved title as its name; the field below edits it in place. */}
              <SheetTitle className="sr-only">{task.title}</SheetTitle>
              <InlineText value={task.title} label="Título da tarefa" required="Informe o título da tarefa." maxLength={200}
                className="break-words text-xl font-medium leading-snug" onCommit={title => save({ title })} />
              <WorkFeedback error={actions.error} retry={() => void detail.refetch()} />
              <div className="mt-3"><PeekBody task={task} onSave={save} disabled={saving} /></div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <SheetTitle className="text-xl font-medium">{missing ? "Tarefa indisponível" : detail.isError ? "Não foi possível abrir a tarefa" : "Carregando tarefa"}</SheetTitle>
              {missing ? <WorkFeedback message="Essa tarefa não existe ou foi excluída." />
                : detail.isError ? <WorkFeedback error={detail.error} retry={() => void detail.refetch()} />
                : <div className="flex flex-col gap-4" aria-hidden><Skeleton className="h-7 w-2/3" /><Skeleton className="h-8 w-full" /><Skeleton className="h-24 w-full" /></div>}
            </div>
          )}
        </div>
      </div>
      {/* Inside the panel, so the confirmation counts as part of it and does not dismiss it as an outside click. */}
      <ConfirmDialog open={deleting} onOpenChange={setDeleting} title="Excluir tarefa?" objectName={task?.title ?? ""} confirmLabel="Excluir tarefa" error={actions.error} onConfirm={remove} />
    </>
  );

  return mode === "peek" ? (
        <Sheet open modal={false} onOpenChange={onOpenChange}>
          <SheetContent side="right" showClose={false} aria-describedby={undefined} onEscapeKeyDown={keepOpenWhileEditing}
            className="flex w-full flex-col gap-0 bg-card p-0 sm:max-w-xl lg:max-w-2xl">
            {content}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open onOpenChange={onOpenChange}>
          <DialogContent showClose={false} aria-describedby={undefined} onEscapeKeyDown={keepOpenWhileEditing}
            className={cn("flex flex-col gap-0 overflow-hidden bg-card p-0",
              mode === "modal" ? "h-5/6 max-w-3xl" : "inset-0 h-full max-w-none translate-x-0 translate-y-0 border-0 sm:rounded-none")}>
            {content}
          </DialogContent>
        </Dialog>
      );
}
