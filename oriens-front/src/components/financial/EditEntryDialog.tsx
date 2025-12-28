import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { EntryDTO, TagDTO } from '@/types/financial';
import { updateEntry } from '@/services/financialService';
import { useAuth } from '@/context/AuthContext';

interface EditEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: EntryDTO | null;
  tags: TagDTO[];
  onSuccess: () => void;
}

export function EditEntryDialog({ open, onOpenChange, entry, tags, onSuccess }: EditEntryDialogProps) {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [amount, setAmount] = useState('');
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [description, setDescription] = useState('');
  const [tagId, setTagId] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (entry) {
      setAmount(entry.amount.toString());
      setEntryDate(parseISO(entry.entryDate));
      setDescription(entry.description || '');
      setTagId(entry.tagId.toString());
    }
  }, [entry]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!amount || amount === '0') {
      newErrors.amount = 'Valor é obrigatório';
    } else {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount)) {
        newErrors.amount = 'Valor inválido';
      } else if (numAmount < -999999999.99 || numAmount > 999999999999.99) {
        newErrors.amount = 'Valor fora dos limites permitidos';
      }
    }

    if (!entryDate) {
      newErrors.entryDate = 'Data é obrigatória';
    }

    if (!tagId) {
      newErrors.tagId = 'Tag é obrigatória';
    }

    if (description && description.length > 255) {
      newErrors.description = 'Descrição deve ter no máximo 255 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !entry) return;

    setIsLoading(true);
    try {
      await updateEntry(userId!, entry.id!, {
        amount: parseFloat(amount),
        entryDate: format(entryDate, 'yyyy-MM-dd'),
        description: description || undefined,
        tagId: parseInt(tagId),
      });

      toast({
        title: 'Entrada atualizada',
        description: 'A entrada foi atualizada com sucesso.',
      });

      setErrors({});
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar entrada',
        description: error.response?.data?.message || 'Ocorreu um erro ao atualizar a entrada.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTag = tags.find(tag => tag.id?.toString() === tagId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Entrada</DialogTitle>
          <DialogDescription>
            Atualize as informações da entrada financeira.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Valor <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={cn('pl-10', errors.amount && 'border-red-500')}
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Use valores negativos para despesas e positivos para receitas
            </p>
          </div>

          {/* Data */}
          <div className="space-y-2">
            <Label>
              Data <span className="text-red-500">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !entryDate && 'text-muted-foreground',
                    errors.entryDate && 'border-red-500'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {entryDate ? format(entryDate, 'dd/MM/yyyy') : 'Selecione uma data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={entryDate}
                  onSelect={(date) => date && setEntryDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.entryDate && (
              <p className="text-sm text-red-500">{errors.entryDate}</p>
            )}
          </div>

          {/* Tag */}
          <div className="space-y-2">
            <Label htmlFor="tag">
              Tag <span className="text-red-500">*</span>
            </Label>
            <Select value={tagId} onValueChange={setTagId}>
              <SelectTrigger className={cn(errors.tagId && 'border-red-500')}>
                <SelectValue placeholder="Selecione uma tag">
                  {selectedTag && (
                    <div className="flex items-center gap-2">
                      <Badge style={{ backgroundColor: selectedTag.color }}>
                        {selectedTag.name}
                      </Badge>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id!.toString()}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tagId && (
              <p className="text-sm text-red-500">{errors.tagId}</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descrição da entrada (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={cn(errors.description && 'border-red-500')}
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {description.length}/255 caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
