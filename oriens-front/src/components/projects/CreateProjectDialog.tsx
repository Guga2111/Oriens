import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/common/ResponsiveDialog";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, PlusCircle, X } from "lucide-react";
import apiClient from "@/services/api";
import { useAuth } from "@/context/AuthContext"; 
import { parseLocalDate } from "@/lib/date";
import type { ObjectiveDTO, ProjectDTO } from "@/types/project";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  projectToEdit?: ProjectDTO | null;
}

interface ObjectiveInput {
  title: string;
  dueDate: string;
  status?: ObjectiveDTO["status"];
}

export function CreateProjectDialog({ open, onOpenChange, onSuccess, projectToEdit }: CreateProjectDialogProps) {
  const { userId } = useAuth(); 
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#CCCCCC");
  const [objectives, setObjectives] = useState<ObjectiveInput[]>([{ title: "", dueDate: "" }]);
  const [isLoading, setIsLoading] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!projectToEdit;

  useEffect(() => {
    if (open) {
      setErrors({});
      if (isEditMode && projectToEdit) {
        setTitle(projectToEdit.title);
        setDescription(projectToEdit.description || "");
        setColor(projectToEdit.color || "#CCCCCC");
        const formattedObjectives = projectToEdit.objectives.map(obj => {
          const due = parseLocalDate(obj.dueDate);
          return {
            title: obj.title,
            dueDate: due ? format(due, "yyyy-MM-dd") : "",
            status: obj.status,
          };
        });
        setObjectives(formattedObjectives);
      } else { 
        setTitle("");
        setDescription("");
        setColor("#CCCCCC");
        setObjectives([{ title: "", dueDate: "" }]);
      }
    }
  }, [open, projectToEdit, isEditMode]);

  const handleObjectiveChange = (index: number, field: "title" | "dueDate", value: string) => {
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
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = 'Informe o título do projeto.';
    if (!/^#[0-9a-f]{6}$/i.test(color)) nextErrors.color = 'Escolha uma cor válida.';
    objectives.forEach((objective, index) => {
      if (objective.dueDate && !objective.title.trim()) {
        nextErrors[`objective-${index}`] = 'Informe o título deste objetivo.';
      }
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !userId) return;
    setIsLoading(true);

    const payload = {
      title,
      description,
      color,
      imageUrl: isEditMode ? projectToEdit?.imageUrl : undefined,
      objectives: objectives
        .filter(o => o.title.trim() !== "")
        .map(o => ({
          title: o.title,
          dueDate: o.dueDate || null,
          status: o.status || "PENDING",
        })),
    };

    try {
      if (isEditMode) {
        await apiClient.put(`/project/${projectToEdit!.id}`, payload);
        toast.success("Sucesso!", {
          description: "Projeto atualizado.",
        });
      } else {
        await apiClient.post(`/project/user/${userId}`, payload);
        toast.success("Sucesso!", {
          description: "Novo projeto criado.",
        });
      }
      onSuccess();
      onOpenChange(false); 
    } catch (error) {
      setErrors({ submit: `Não foi possível ${isEditMode ? "atualizar" : "criar"} o projeto. Tente novamente.` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? "Editar Projeto" : "Criar Novo Projeto"}
      description="Preencha os detalhes abaixo."
      className="sm:max-w-[525px]"
      footer={
        <Button type="submit" form="project-form" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditMode ? "Salvar Alterações" : "Criar Projeto"}
        </Button>
      }
    >
        <form id="project-form" onSubmit={handleSubmit} className="grid gap-4" noValidate aria-busy={isLoading}>
          <Field>
            <FieldLabel htmlFor="title">Título do Projeto</FieldLabel>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "project-title-error" : undefined} />
            {errors.title && <FieldError id="project-title-error">{errors.title}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="description">Descrição (Opcional)</FieldLabel>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="color">Cor</FieldLabel>
            <div className="flex items-center gap-2">
              <Input id="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="p-1 h-10 w-14" aria-invalid={Boolean(errors.color)} aria-describedby={errors.color ? "project-color-error" : undefined} />
              <span className="text-sm text-muted-foreground">{color}</span>
              {errors.color && <FieldError id="project-color-error">{errors.color}</FieldError>}
            </div>
          </Field>
          <Field>
            <span className="text-sm font-medium">Objetivos</span>
            <div className="flex flex-col gap-3">
              {objectives.map((obj, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    aria-label={`Objetivo ${index + 1}`}
                    aria-invalid={Boolean(errors[`objective-${index}`])}
                    aria-describedby={errors[`objective-${index}`] ? `objective-${index}-error` : undefined}
                    placeholder={`Objetivo ${index + 1}`}
                    value={obj.title}
                    onChange={(e) => handleObjectiveChange(index, 'title', e.target.value)}
                  />
                  <Input
                    aria-label={`Data do objetivo ${index + 1}`}
                    type="date"
                    value={obj.dueDate}
                    onChange={(e) => handleObjectiveChange(index, 'dueDate', e.target.value)}
                  />
                  {errors[`objective-${index}`] && <FieldError id={`objective-${index}-error`}>{errors[`objective-${index}`]}</FieldError>}
                  <Button aria-label={`Remover objetivo ${index + 1}`} type="button" variant="ghost" size="icon" onClick={() => removeObjective(index)} disabled={objectives.length <= 1}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addObjective} className="mt-2">
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Objetivo
            </Button>
          </Field>
          {errors.submit && <FieldError>{errors.submit}</FieldError>}
        </form>
    </ResponsiveDialog>
  );
}