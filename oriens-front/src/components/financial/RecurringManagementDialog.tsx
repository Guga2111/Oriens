import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { EntryDTO, TagDTO, RecurrencePatternLabels } from '@/types/financial';
import { getRecurringEntries, deleteEntry } from '@/services/financialService';
import { cn } from '@/lib/utils';

interface RecurringManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  tags: TagDTO[];
  onEditEntry: (entry: EntryDTO) => void;
  onEntriesChange: () => void;
}

export function RecurringManagementDialog({
  open,
  onOpenChange,
  userId,
  tags,
  onEditEntry,
  onEntriesChange,
}: RecurringManagementDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [recurringEntries, setRecurringEntries] = useState<EntryDTO[]>([]);
  const [deletingEntry, setDeletingEntry] = useState<EntryDTO | null>(null);

  useEffect(() => {
    if (open) {
      loadRecurringEntries();
    }
  }, [open, userId]);

  const loadRecurringEntries = async () => {
    setIsLoading(true);
    try {
      const entries = await getRecurringEntries(userId);
      setRecurringEntries(entries);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar recorrencias',
        description: 'Nao foi possivel carregar as entradas recorrentes.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEntry) return;

    setIsLoading(true);
    try {
      await deleteEntry(userId, deletingEntry.id!);
      toast({
        title: 'Recorrencia excluida',
        description: 'A entrada recorrente foi excluida com sucesso.',
      });
      setDeletingEntry(null);
      await loadRecurringEntries();
      onEntriesChange();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir recorrencia',
        description: error.response?.data?.message || 'Ocorreu um erro ao excluir a entrada.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (entry: EntryDTO) => {
    onOpenChange(false);
    onEditEntry(entry);
  };

  const getTagById = (tagId: number) => {
    return tags.find(tag => tag.id === tagId);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Math.abs(value));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Gerenciar Recorrencias</DialogTitle>
            <DialogDescription>
              Visualize e gerencie suas entradas financeiras recorrentes.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : recurringEntries.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Nenhuma entrada recorrente encontrada.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Crie uma nova entrada e marque como recorrente para ela aparecer aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recurringEntries.map((entry) => {
                    const tag = getTagById(entry.tagId);
                    const isExpense = entry.amount < 0;

                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                'font-semibold',
                                isExpense ? 'text-red-500' : 'text-green-500'
                              )}
                            >
                              {isExpense ? '-' : '+'} {formatCurrency(entry.amount)}
                            </span>
                            {tag && (
                              <Badge style={{ backgroundColor: tag.color }}>
                                {tag.name}
                              </Badge>
                            )}
                          </div>
                          {entry.description && (
                            <p className="text-sm text-muted-foreground">
                              {entry.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              Padrao: {entry.recurrencePattern && RecurrencePatternLabels[entry.recurrencePattern]}
                            </span>
                            <span>
                              Inicio: {format(parseISO(entry.entryDate), 'dd/MM/yyyy')}
                            </span>
                            {entry.recurrenceEndDate && (
                              <span>
                                Fim: {format(parseISO(entry.recurrenceEndDate), 'dd/MM/yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 ml-4">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(entry)}
                            disabled={isLoading}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeletingEntry(entry)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingEntry} onOpenChange={() => setDeletingEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta entrada recorrente? As entradas ja geradas
              automaticamente nao serao afetadas, mas novas entradas nao serao mais criadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-500 hover:bg-red-600"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
