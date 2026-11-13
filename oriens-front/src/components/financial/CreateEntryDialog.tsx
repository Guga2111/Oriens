import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResponsiveDialog } from '@/components/common/ResponsiveDialog';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { TagDTO, RecurrencePattern, RecurrencePatternLabels } from '@/types/financial';
import { createEntry } from '@/services/financialService';
import { useAuth } from '@/context/AuthContext';

interface CreateEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: TagDTO[];
  onSuccess: () => void;
}

export function CreateEntryDialog({ open, onOpenChange, tags, onSuccess }: CreateEntryDialogProps) {
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [amount, setAmount] = useState('');
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [description, setDescription] = useState('');
  const [tagId, setTagId] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern | ''>('');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>(undefined);

  const [errors, setErrors] = useState<Record<string, string>>({});

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

    if (isRecurring && !recurrencePattern) {
      newErrors.recurrencePattern = 'Escolha o padrão de recorrência.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      await createEntry(userId!, {
        amount: parseFloat(amount),
        entryDate: format(entryDate, 'yyyy-MM-dd'),
        description: description || undefined,
        tagId: parseInt(tagId),
        isRecurring: isRecurring,
        recurrencePattern: isRecurring && recurrencePattern ? recurrencePattern : undefined,
        recurrenceEndDate: isRecurring && recurrenceEndDate ? format(recurrenceEndDate, 'yyyy-MM-dd') : undefined,
      });

      toast.success('Entrada criada', {
        description: 'A entrada foi criada com sucesso.',
      });

      setAmount('');
      setEntryDate(new Date());
      setDescription('');
      setTagId('');
      setIsRecurring(false);
      setRecurrencePattern('');
      setRecurrenceEndDate(undefined);
      setErrors({});
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      setErrors({ submit: "Não foi possível salvar. Revise os dados e tente novamente." });
      console.error('Erro ao criar entrada:', error);
      toast.error('Erro ao criar entrada', {
        description:
          error.response?.data?.message ||
          'Não foi possível salvar a entrada.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTag = tags.find(tag => tag.id?.toString() === tagId);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nova Entrada"
      description="Adicione uma nova receita ou despesa financeira."
      className="sm:max-w-[500px]"
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Entrada
          </Button>
        </>
      }
    >
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
              placeholder="Descrição da entrada financeira"
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

          {/* Recorrência */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRecurring"
                checked={isRecurring}
                onCheckedChange={(checked) => {
                  setIsRecurring(checked as boolean);
                  if (!checked) {
                    setRecurrencePattern('');
                    setRecurrenceEndDate(undefined);
                  }
                }}
              />
              <Label htmlFor="isRecurring" className="text-sm font-normal cursor-pointer">
                Esta é uma entrada recorrente
              </Label>
            </div>

            {isRecurring && (
              <div className="flex flex-col gap-4 border-l-2 border-muted pl-6">
                {/* Padrão de Recorrência */}
                <Field data-invalid={Boolean(errors.recurrencePattern)}>
                  <FieldLabel htmlFor="recurrencePattern">
                    Padrão de recorrência
                  </FieldLabel>
                  <Select
                    value={recurrencePattern}
                    onValueChange={(value) => setRecurrencePattern(value as RecurrencePattern)}
                  >
                    <SelectTrigger
                      id="recurrencePattern"
                      className={cn(errors.recurrencePattern && 'border-destructive')}
                      aria-invalid={Boolean(errors.recurrencePattern)}
                      aria-describedby={
                        errors.recurrencePattern ? 'recurrencePattern-error' : undefined
                      }
                    >
                      <SelectValue placeholder="Selecione a frequência">
                        {recurrencePattern && RecurrencePatternLabels[recurrencePattern as RecurrencePattern]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RecurrencePatternLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.recurrencePattern && (
                    <FieldError id="recurrencePattern-error">
                      {errors.recurrencePattern}
                    </FieldError>
                  )}
                </Field>

                {/* Data Final de Recorrência (Opcional) */}
                <Field>
                  <FieldLabel htmlFor="recurrenceEndDate">
                    Data final (opcional)
                  </FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="recurrenceEndDate"
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !recurrenceEndDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {recurrenceEndDate ? format(recurrenceEndDate, 'dd/MM/yyyy') : 'Sem data final'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={recurrenceEndDate}
                        onSelect={(date) => date && setRecurrenceEndDate(date)}
                        disabled={(date) => date < entryDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FieldDescription>
                    Deixe em branco para recorrência sem fim.
                  </FieldDescription>
                </Field>
              </div>
            )}
          </div>
        </div>
    </ResponsiveDialog>
  );
}
