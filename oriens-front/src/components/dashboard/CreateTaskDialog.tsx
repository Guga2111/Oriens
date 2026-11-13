import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/common/ResponsiveDialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useGoogleMapsScript } from "@/hooks/useGoogleMapsScript";
import { LocationInput } from "../common/LocationInput";
import { PRIORITY } from "@/lib/labels";
import type { TaskPriority } from "@/types/task";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: () => void;
  /** Data pré-preenchida ao abrir (ex.: período vazio ou dia visível). */
  defaultDate?: Date;
  /** Hora inicial sugerida para o período. */
  defaultStartTime?: string;
}
interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}
const libraries = ["places"];

export function CreateTaskDialog({ open, onOpenChange, onTaskCreated, defaultDate, defaultStartTime }: CreateTaskDialogProps) {
  const { userId } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("");
  const [priority, setPriority] = useState<TaskPriority>();
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { isLoaded, loadError } = useGoogleMapsScript({
    apiKey: import.meta.env.VITE_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: libraries,
  });

  useEffect(() => {
    if (!open) {
      setTitle(""); setDescription(""); setDueDate(undefined);
      setStartTime(""); setPriority(undefined); setLocation(null);
      setIsLoading(false); setErrors({});
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setDueDate(defaultDate);
      setStartTime(defaultStartTime ?? "");
    }
  }, [open, defaultDate, defaultStartTime]);

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
    if (!userId) {
      toast.error("Usuário não identificado");
      return;
    }
    setIsLoading(true);
    try {
      const newTask = {
        title, description, dueDate: format(dueDate, "yyyy-MM-dd"),
        startTime: `${startTime}:00`, priority, status: 'PENDING', location,
      };
      await apiClient.post(`/task/user/${userId}`, newTask);
      onTaskCreated(); onOpenChange(false);
    } catch (error) {
      setErrors({ submit: "Não foi possível salvar. Revise os dados e tente novamente." });
      console.error("Erro ao criar tarefa:", error);
      toast.error("Erro", {
        description: "Não foi possível criar a tarefa.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Criar Nova Tarefa"
      description="Preencha os detalhes abaixo para adicionar uma nova tarefa ao seu dia."
      className="sm:max-w-[425px]"
      footer={
        <Button type="submit" form="create-task-form" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Tarefa
        </Button>
      }
    >
      <form id="create-task-form" onSubmit={handleSubmit} className="grid gap-4" noValidate>
        <Field data-invalid={Boolean(errors.title)}>
          <FieldLabel htmlFor="title">Título</FieldLabel>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Ex: Reunião de alinhamento semanal"
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
            placeholder="Ex: Discutir os pontos da última sprint..."
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Localização (opcional)
          </FieldLabel>
          <LocationInput id="location" aria-invalid={Boolean(loadError)} aria-describedby={loadError ? "location-error" : undefined} isLoaded={isLoaded} onPlaceSelect={setLocation} />
          {loadError && (
            <FieldError id="location-error">Erro ao carregar o serviço de mapas.</FieldError>
          )}
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
                  {dueDate ? format(dueDate, "dd/MM/yyyy") : <span>Escolha data</span>}
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
            onValueChange={(value: TaskPriority) => setPriority(value)}
            value={priority || ""}
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

        <FieldDescription>
          A tarefa entra no seu dia e pode ser concluída em um clique.
        </FieldDescription>
        {errors.submit && <FieldError>{errors.submit}</FieldError>}
      </form>
    </ResponsiveDialog>
  );
}
