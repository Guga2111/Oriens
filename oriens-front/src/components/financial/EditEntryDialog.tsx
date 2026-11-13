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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { toast } from 'sonner';
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
      setTagId(entry.tagId ? entry.tagId.toString() : '');
      setErrors({});
    }
  }, [entry]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!amount || amount === '0') {
      newErrors.amount = 'Informe o valor da entrada.';
    } else {
      const numAmount = parseFloat(amount);
      if (!Number.isFinite(numAmount) || numAmount === 0) {
        newErrors.amount = 'Valor inválido.';
      } else if (numAmount < -999999999.99 || numAmount > 999999999999.99) {
        newErrors.amount = 'Valor fora dos limites permitidos.';
      }
    }

    if (!entryDate) {
      newErrors.entryDate = 'Escolha a data da entrada.';
    }

    if (!tagId) {
      newErrors.tagId = 'Selecione uma tag.';
    }

    if (description && description.length > 255) {
      newErrors.description = 'A descrição deve ter no máximo 255 caracteres.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !entry) return;

    setIsLoading(true);
    try {
      await updateEntry(userId!, entry.id, {
        ...entry,
        amount: parseFloat(amount),
        entryDate: format(entryDate, 'yyyy-MM-dd'),
        description: description || undefined,
        tagId: parseInt(tagId),
      });

      toast.success('Entrada atualizada', {
        description: 'A entrada foi atualizada com sucesso.',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      setErrors({ submit: "Não foi possível salvar. Revise os dados e tente novamente." });
      console.error('Erro ao atualizar entrada:', error);
      toast.error('Erro ao atualizar entrada', {
        description:
          error.response?.data?.message ||
          'Não foi possível atualizar a entrada.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTag = tags.find(tag => tag.id?.toString() === tagId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Entrada</DialogTitle>
          <DialogDescription>
            Atualize as informações da entrada financeira.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {errors.submit && <FieldError>{errors.submit}</FieldError>}
          {/* Valor */}
          <Field data-invalid={Boolean(errors.amount)}>
            <FieldLabel htmlFor="amount">Valor</FieldLabel>
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
                className={cn('pl-10', errors.amount && 'border-destructive')}
                aria-invalid={Boolean(errors.amount)}
                aria-describedby={errors.amount ? 'amount-error' : 'amount-hint'}
              />
            </div>
            {errors.amount ? (
              <FieldError id="amount-error">{errors.amount}</FieldError>
            ) : (
              <FieldDescription id="amount-hint">
                Use valores negativos para despesas e positivos para receitas.
              </FieldDescription>
            )}
          </Field>

          {/* Data */}
          <Field data-invalid={Boolean(errors.entryDate)}>
            <FieldLabel htmlFor="entryDate">Data</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="entryDate"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !entryDate && 'text-muted-foreground',
                    errors.entryDate && 'border-destructive'
                  )}
                  aria-invalid={Boolean(errors.entryDate)}
                  aria-describedby={errors.entryDate ? 'entryDate-error' : undefined}
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
              <FieldError id="entryDate-error">{errors.entryDate}</FieldError>
            )}
          </Field>

          {/* Tag */}
          <Field data-invalid={Boolean(errors.tagId)}>
            <FieldLabel htmlFor="tag">Tag</FieldLabel>
            <Select value={tagId} onValueChange={setTagId}>
              <SelectTrigger
                id="tag"
                className={cn(errors.tagId && 'border-destructive')}
                aria-invalid={Boolean(errors.tagId)}
                aria-describedby={errors.tagId ? 'tag-error' : undefined}
              >
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
              <FieldError id="tag-error">{errors.tagId}</FieldError>
            )}
          </Field>

          {/* Descrição */}
          <Field data-invalid={Boolean(errors.description)}>
            <FieldLabel htmlFor="description">Descrição</FieldLabel>
            <Textarea
              id="description"
              placeholder="Descrição da entrada (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={cn(errors.description && 'border-destructive')}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={
                errors.description ? 'description-error' : 'description-hint'
              }
              rows={3}
            />
            {errors.description ? (
              <FieldError id="description-error">{errors.description}</FieldError>
            ) : (
              <FieldDescription id="description-hint">
                {description.length}/255 caracteres
              </FieldDescription>
            )}
          </Field>
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
