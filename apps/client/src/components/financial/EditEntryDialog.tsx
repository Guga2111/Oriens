import { useCallback, useState, useEffect } from 'react';
import { isAxiosError } from 'axios';
import { DraftDialog } from '@/components/common/DraftDialog';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { useCreationAttempt } from '@/hooks/useCreationAttempt';
import { financialAmountError } from '@/lib/financial-form';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Field,
  FieldGroup,
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
  SelectGroup,
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
import { getEntry, updateEntry } from '@/services/financialService';
import { useAuth } from '@/context/AuthContext';

interface EditEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: EntryDTO | null;
  tags: TagDTO[];
  onSuccess: () => void;
}

// eslint-disable-next-line complexity -- existing score 38; owner: client maintainers.
export function EditEntryDialog({ open, onOpenChange, entry, tags, onSuccess }: EditEntryDialogProps) {
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const attempt = useCreationAttempt();
  const [failure, setFailure] = useState<unknown>(null);
  const [stale, setStale] = useState(false);
  const [base, setBase] = useState<EntryDTO | null>(entry);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  const [amount, setAmount] = useState('');
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [description, setDescription] = useState('');
  const [tagId, setTagId] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetAttempt = attempt.reset;
  const loadDraft = useCallback((value: EntryDTO) => {
    setBase(value); setAmount(value.amount.toString()); setEntryDate(parseISO(value.entryDate));
    setDescription(value.description || ''); setTagId(value.tagId > 0 ? value.tagId.toString() : '');
    setRecurrenceEndDate(value.recurrenceEndDate || ''); setErrors({}); setFailure(null); setStale(false); resetAttempt();
  }, [resetAttempt]);
  useEffect(() => { if (entry) loadDraft(entry); }, [entry, loadDraft]);
  async function reload() {
    if (!userId || !entry?.id) return;
    setIsLoading(true);
    try { loadDraft(await getEntry(userId, entry.id)); } catch (error) { setFailure(error); }
    finally { setIsLoading(false); }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {};

    const amountError = financialAmountError(amount);
    if (amountError) newErrors.amount = amountError;

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
    if (isLoading || stale || !validate() || !base) return;

    setIsLoading(true);
    setFailure(null);
    try {
      const command = attempt.prepare({
        ...base,
        amount: parseFloat(amount),
        entryDate: format(entryDate, 'yyyy-MM-dd'),
        description: description || undefined,
        tagId: parseInt(tagId),
        recurrenceEndDate: recurrenceEndDate || undefined,
      });
      await updateEntry(userId!, base.id!, command.body, command.key);
      attempt.reset();

      toast.success('Entrada atualizada', {
        description: 'A entrada foi atualizada com sucesso.',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      attempt.failed(error); setFailure(error);
      if (!Number.isSafeInteger(base.version) || isAxiosError(error) && [409, 428].includes(error.response?.status ?? 0)) setStale(true);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTag = tags.find(tag => tag.id?.toString() === tagId);

  return (
    <DraftDialog open={open} onOpenChange={onOpenChange} title="Editar Entrada"
      description="Atualize as informações da entrada financeira." className="sm:max-w-[500px]"
      busy={isLoading} uncertain={attempt.uncertain}
      dirty={Boolean(base && (amount !== base.amount.toString() || description !== (base.description || '') || tagId !== base.tagId.toString() || format(entryDate, 'yyyy-MM-dd') !== base.entryDate || recurrenceEndDate !== (base.recurrenceEndDate || '')))}
      footer={<Button onClick={handleSubmit} disabled={isLoading || stale}>
        {isLoading && <Loader2 className="animate-spin" aria-hidden />}
        Salvar Alterações
      </Button>}>
        {failure && <div className="mb-4"><WorkFeedback error={failure} retry={stale ? () => void reload() : undefined} retryLabel="Descartar rascunho e recarregar" message={
          failure instanceof Error && !isAxiosError(failure) ? failure.message :
          attempt.uncertain && !(isAxiosError(failure) && [409, 410].includes(failure.response?.status ?? 0))
            ? "Confirmação indisponível. Seu rascunho foi mantido. Repita pelo botão Salvar Alterações para verificar o mesmo pedido sem duplicá-lo." : undefined
        } /></div>}
        <fieldset disabled={isLoading || stale || attempt.uncertain} className="min-w-0"><FieldGroup className="gap-4">
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
              <SelectContent><SelectGroup>
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
              </SelectGroup></SelectContent>
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
          {base?.isRecurring && <Field>
            <FieldLabel htmlFor="edit-recurrence-end">Data final da recorrência</FieldLabel>
            <Input id="edit-recurrence-end" type="date" value={recurrenceEndDate} min={base.entryDate} onChange={e => setRecurrenceEndDate(e.target.value)} />
            <FieldDescription>Encerre pela data final para preservar os lançamentos já gerados. Em branco, a recorrência continua.</FieldDescription>
          </Field>}
        </FieldGroup></fieldset>
    </DraftDialog>
  );
}
