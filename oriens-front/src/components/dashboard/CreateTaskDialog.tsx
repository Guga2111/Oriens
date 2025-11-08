import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useGoogleMapsScript } from "@/hooks/useGoogleMapsScript";
import { LocationInput } from "../common/LocationInput";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: () => void;
}
interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}
const libraries = ["places"];

export function CreateTaskDialog({ open, onOpenChange, onTaskCreated }: CreateTaskDialogProps) {
  const { userId } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("");
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>();
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);

  const { isLoaded, loadError } = useGoogleMapsScript({
    apiKey: import.meta.env.VITE_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: libraries,
  });

  useEffect(() => {
    if (!open) {
      setTitle(""); setDescription(""); setDueDate(undefined);
      setStartTime(""); setPriority(undefined); setLocation(null);
      setIsLoading(false);
    }
  }, [open]);
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!dueDate || !startTime || !priority || !userId) {
      toast({ variant: "destructive", title: "Erro", description: "Por favor, preencha todos os campos." });
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
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível criar a tarefa." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Nova Tarefa</DialogTitle>
          <DialogDescription>
            Preencha os detalhes abaixo para adicionar uma nova tarefa ao seu dia.
          </DialogDescription>
        </DialogHeader>
        <form id="create-task-form" onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ex: Reunião de alinhamento semanal" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Descrição (Opcional)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Discutir os pontos da última sprint..." />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Localização (Opcional)
            </Label>
            <LocationInput isLoaded={isLoaded} onPlaceSelect={setLocation} />
            {loadError && <p className="text-sm text-destructive mt-1">Erro ao carregar o serviço de mapas.</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy") : <span>Escolha data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="startTime">Horário</Label>
              <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select onValueChange={(value: "LOW" | "MEDIUM" | "HIGH") => setPriority(value)} value={priority || ""} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Baixa</SelectItem>
                <SelectItem value="MEDIUM">Média</SelectItem>
                <SelectItem value="HIGH">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="create-task-form" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}