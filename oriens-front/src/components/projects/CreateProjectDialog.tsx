import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, X } from "lucide-react";
import apiClient from "@/services/api";
import { useAuth } from "@/context/AuthContext"; 
import { ProjectDTO } from "./ProjectCard"; 

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  projectToEdit?: ProjectDTO | null;
}

interface ObjectiveInput {
  title: string;
  dueDate: string;
}

export function CreateProjectDialog({ open, onOpenChange, onSuccess, projectToEdit }: CreateProjectDialogProps) {
  const { userId } = useAuth(); 
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#CCCCCC");
  const [objectives, setObjectives] = useState<ObjectiveInput[]>([{ title: "", dueDate: "" }]);
  const [isLoading, setIsLoading] = useState(false);

  const isEditMode = !!projectToEdit;

  useEffect(() => {
    if (open) {
      if (isEditMode && projectToEdit) {
        setTitle(projectToEdit.title);
        setDescription(projectToEdit.description || "");
        setColor(projectToEdit.color || "#CCCCCC");
        const formattedObjectives = projectToEdit.objectives.map(obj => ({
        title: obj.title,
        dueDate: obj.dueDate ? format(new Date(obj.dueDate), 'yyyy-MM-dd') : "",
      }));
      setObjectives(formattedObjectives);
      } else { 
        setTitle("");
        setDescription("");
        setColor("#CCCCCC");
        setObjectives([{ title: "", dueDate: "" }]);
      }
    }
  }, [open, projectToEdit, isEditMode]);

  const handleObjectiveChange = (index: number, field: keyof ObjectiveInput, value: string) => {
    const newObjectives = [...objectives];
    newObjectives[index][field] = value;
    setObjectives(newObjectives);
  };

  const addObjective = () => {
    setObjectives([...objectives, { title: "", dueDate: "" }]);
  };

  const removeObjective = (index: number) => {
    if (objectives.length > 1) {
      setObjectives(objectives.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    const payload = {
      title,
      description,
      color,
      objectives: objectives.filter(o => o.title.trim() !== ""), 
    };

    try {
      if (isEditMode) {
        await apiClient.put(`/project/${projectToEdit!.id}`, payload);
        toast({ title: "Sucesso!", description: "Projeto atualizado." });
      } else {
        await apiClient.post(`/project/user/${userId}`, payload);
        toast({ title: "Sucesso!", description: "Novo projeto criado." });
      }
      onSuccess();
      onOpenChange(false); 
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Não foi possível ${isEditMode ? 'atualizar' : 'criar'} o projeto.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader className="px-1">
          <DialogTitle>{isEditMode ? "Editar Projeto" : "Criar Novo Projeto"}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes abaixo.
          </DialogDescription>
        </DialogHeader>
        <form id="project-form" onSubmit={handleSubmit} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
          <div className="grid gap-2">
            <Label htmlFor="title">Título do Projeto</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Descrição (Opcional)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="color">Cor</Label>
            <div className="flex items-center gap-2">
              <Input id="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="p-1 h-10 w-14" />
              <span className="text-sm text-muted-foreground">{color}</span>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Objetivos</Label>
            <div className="space-y-3">
              {objectives.map((obj, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder={`Objetivo ${index + 1}`}
                    value={obj.title}
                    onChange={(e) => handleObjectiveChange(index, 'title', e.target.value)}
                  />
                  <Input
                    type="date"
                    value={obj.dueDate}
                    onChange={(e) => handleObjectiveChange(index, 'dueDate', e.target.value)}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeObjective(index)} disabled={objectives.length <= 1}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addObjective} className="mt-2">
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Objetivo
            </Button>
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="project-form" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Salvar Alterações" : "Criar Projeto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}