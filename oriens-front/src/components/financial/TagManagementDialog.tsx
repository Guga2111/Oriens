import { useState, useEffect } from 'react';
import { Loader2, Pencil, Trash2, Plus, X, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { TagDTO } from '@/types/financial';
import {
  getAllTags,
  getDefaultTags,
  getCustomTags,
  createTag,
  updateTag,
  deleteTag,
} from '@/services/financialService';
import { cn } from '@/lib/utils';

interface TagManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  onTagsChange: () => void;
}

export function TagManagementDialog({
  open,
  onOpenChange,
  userId,
  onTagsChange,
}: TagManagementDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [defaultTags, setDefaultTags] = useState<TagDTO[]>([]);
  const [customTags, setCustomTags] = useState<TagDTO[]>([]);

  const [isCreating, setIsCreating] = useState(false);
  const [editingTag, setEditingTag] = useState<TagDTO | null>(null);
  const [deletingTag, setDeletingTag] = useState<TagDTO | null>(null);

  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#3b82f6');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      loadTags();
    }
  }, [open, userId]);

  const loadTags = async () => {
    setIsLoading(true);
    try {
      const [defaultTagsData, customTagsData] = await Promise.all([
        getDefaultTags(userId),
        getCustomTags(userId),
      ]);
      setDefaultTags(defaultTagsData);
      setCustomTags(customTagsData);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar tags',
        description: 'Não foi possível carregar as tags.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formName || formName.length < 2) {
      errors.name = 'Nome deve ter pelo menos 2 caracteres';
    } else if (formName.length > 50) {
      errors.name = 'Nome deve ter no máximo 50 caracteres';
    }

    if (!/^#[0-9A-Fa-f]{6}$/.test(formColor)) {
      errors.color = 'Cor deve estar no formato #RRGGBB';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await createTag(userId, { name: formName, color: formColor });
      toast({
        title: 'Tag criada',
        description: 'A tag foi criada com sucesso.',
      });
      resetForm();
      await loadTags();
      onTagsChange();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar tag',
        description: error.response?.data?.message || 'Ocorreu um erro ao criar a tag.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!validateForm() || !editingTag) return;

    setIsLoading(true);
    try {
      await updateTag(userId, editingTag.id!, { name: formName, color: formColor });
      toast({
        title: 'Tag atualizada',
        description: 'A tag foi atualizada com sucesso.',
      });
      resetForm();
      await loadTags();
      onTagsChange();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar tag',
        description: error.response?.data?.message || 'Ocorreu um erro ao atualizar a tag.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTag) return;

    setIsLoading(true);
    try {
      await deleteTag(userId, deletingTag.id!);
      toast({
        title: 'Tag excluída',
        description: 'A tag foi excluída com sucesso.',
      });
      setDeletingTag(null);
      await loadTags();
      onTagsChange();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir tag',
        description: error.response?.data?.message || 'Ocorreu um erro ao excluir a tag.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (tag: TagDTO) => {
    setEditingTag(tag);
    setFormName(tag.name);
    setFormColor(tag.color);
    setIsCreating(false);
  };

  const startCreate = () => {
    setIsCreating(true);
    setEditingTag(null);
    setFormName('');
    setFormColor('#3b82f6');
  };

  const resetForm = () => {
    setIsCreating(false);
    setEditingTag(null);
    setFormName('');
    setFormColor('#3b82f6');
    setFormErrors({});
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Gerenciar Tags</DialogTitle>
            <DialogDescription>
              Gerencie suas tags financeiras. Tags padrão não podem ser editadas.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              {/* Tags Padrão */}
              <div>
                <h3 className="text-sm font-medium mb-3">Tags Padrão</h3>
                <div className="space-y-2">
                  {defaultTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-sm">{tag.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Padrão
                      </Badge>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Tags padrão não podem ser editadas ou excluídas
                </p>
              </div>

              <Separator />

              {/* Tags Personalizadas */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Tags Personalizadas</h3>
                  {!isCreating && !editingTag && (
                    <Button size="sm" onClick={startCreate}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Tag
                    </Button>
                  )}
                </div>

                {/* Form de Criar/Editar */}
                {(isCreating || editingTag) && (
                  <div className="p-4 border rounded-lg mb-3 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="tag-name">Nome</Label>
                      <Input
                        id="tag-name"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className={cn(formErrors.name && 'border-red-500')}
                        placeholder="Nome da tag"
                      />
                      {formErrors.name && (
                        <p className="text-xs text-red-500">{formErrors.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tag-color">Cor</Label>
                      <div className="flex gap-2">
                        <Input
                          id="tag-color"
                          type="color"
                          value={formColor}
                          onChange={(e) => setFormColor(e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          value={formColor}
                          onChange={(e) => setFormColor(e.target.value)}
                          className={cn('flex-1', formErrors.color && 'border-red-500')}
                          placeholder="#000000"
                        />
                      </div>
                      {formErrors.color && (
                        <p className="text-xs text-red-500">{formErrors.color}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={editingTag ? handleUpdate : handleCreate}
                        disabled={isLoading}
                      >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Check className="h-4 w-4 mr-2" />
                        {editingTag ? 'Salvar' : 'Criar'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={resetForm} disabled={isLoading}>
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Lista de Tags Personalizadas */}
                <div className="space-y-2">
                  {customTags.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma tag personalizada criada
                    </p>
                  ) : (
                    customTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-sm">{tag.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => startEdit(tag)}
                            disabled={isLoading}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeletingTag(tag)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTag} onOpenChange={() => setDeletingTag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a tag "{deletingTag?.name}"? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isLoading} className="bg-red-500 hover:bg-red-600">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
