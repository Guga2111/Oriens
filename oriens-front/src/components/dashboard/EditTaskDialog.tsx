import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import apiClient from "@/services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PRIORITY } from "@/lib/labels";
import type { Task, TaskPriority } from "@/types/task";

interface EditTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: () => void;
}

export function EditTaskDialog({ task, open, onOpenChange, onTaskUpdated }: EditTaskDialogProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [dueDate, setDueDate] = useState<Date | undefined>(parseISO(task.dueDate));
  const [startTime, setStartTime] = useState(task.startTime.substring(0, 5));
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || "");
    setDueDate(parseISO(task.dueDate));
    setStartTime(task.startTime.substring(0, 5));
    setPriority(task.priority);
  }, [task]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) {
      nextErrors.title = "Informe o título da tarefa.";
    }
    if (!dueDate) {
      nextErrors.dueDate = "Escolha a data da tarefa.";
    }
    if (!startTime) {
      nextErrors.startTime = "Informe o horário da tarefa.";
    }
    if (!priority) {
      nextErrors.priority = "Selecione a prioridade.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }
    setIsLoading(true);

    try {
      const updatedTask = {
        ...task, 
        title,
        description,
        dueDate: format(dueDate, "yyyy-MM-dd"),
        startTime: `${startTime}:00`,
        priority,
      };

      await apiClient.put(`/task/${task.id}`, updatedTask);
      onTaskUpdated();
      onOpenChange(false); 
    } catch (error) {
      setErrors({ submit: "Não foi possível salvar. Revise os dados e tente novamente." });
      console.error("Erro ao atualizar tarefa:", error);
      toast.error("Erro", {
        description: "Não foi possível atualizar a tarefa.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Tarefa</DialogTitle>
          <DialogDescription>
            Faça as alterações necessárias na sua tarefa.
          </DialogDescription>
        </DialogHeader>
      <form id="edit-task-form" onSubmit={handleSubmit} className="grid gap-4" noValidate>
        <Field data-invalid={Boolean(errors.title)}>
          <FieldLabel htmlFor="title">Título</FieldLabel>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "title-error" : undefined}
          />
          {errors.title && (
            <FieldError id="title-error">{errors.title}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="description">Descrição (opcional)</FieldLabel>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={Boolean(errors.dueDate)}>
            <FieldLabel htmlFor="dueDate">Data</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="dueDate"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground",
                    errors.dueDate && "border-destructive"
                  )}
                  aria-invalid={Boolean(errors.dueDate)}
                  aria-describedby={errors.dueDate ? "dueDate-error" : undefined}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "dd/MM/yyyy") : <span>Escolha uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus locale={ptBR} />
              </PopoverContent>
            </Popover>
            {errors.dueDate && (
              <FieldError id="dueDate-error">{errors.dueDate}</FieldError>
            )}
          </Field>

          <Field data-invalid={Boolean(errors.startTime)}>
            <FieldLabel htmlFor="startTime">Horário</FieldLabel>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              aria-invalid={Boolean(errors.startTime)}
              aria-describedby={
                errors.startTime ? "startTime-error" : undefined
              }
            />
            {errors.startTime && (
              <FieldError id="startTime-error">{errors.startTime}</FieldError>
            )}
          </Field>
        </div>

        <Field data-invalid={Boolean(errors.priority)}>
          <FieldLabel htmlFor="priority">Prioridade</FieldLabel>
          <Select
            value={priority}
            onValueChange={(value: TaskPriority) => setPriority(value)}
          >
            <SelectTrigger
              id="priority"
              aria-invalid={Boolean(errors.priority)}
              aria-describedby={errors.priority ? "priority-error" : undefined}
              className={cn(errors.priority && "border-destructive")}
            >
              <SelectValue placeholder="Selecione a prioridade" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRIORITY).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.priority && (
            <FieldError id="priority-error">{errors.priority}</FieldError>
          )}
        </Field>
        {errors.submit && <FieldError>{errors.submit}</FieldError>}
      </form>
        <DialogFooter>
          <Button type="submit" form="edit-task-form" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}