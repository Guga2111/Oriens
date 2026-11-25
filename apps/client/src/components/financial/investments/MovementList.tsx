import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { movementCash, MOVEMENT_TYPE } from '@/lib/investments';
import { moneyCents } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { Page } from '@/types/financial';
import type { Movement } from '@/types/investment';

interface MovementListProps {
  page: Page<Movement>;
  /** Names by id; a movement of an investment outside the loaded page shows a neutral name. */
  names: Map<number, string>;
  /** Hidden in an investment's detail, where every movement belongs to it. */
  showInvestment?: boolean;
  onEdit: (movement: Movement) => void;
  onDelete: (movement: Movement) => void;
  onPageChange: (page: number) => void;
}

function signed(value: string) {
  const cents = moneyCents(value);
  return `${cents < 0n ? '−' : '+'} ${formatCurrency(cents < 0n ? value.slice(1) : value)}`;
}

/** Movements newest first, with what each one did to the cash: transfers or income, always signed. */
export function MovementList({ page, names, showInvestment = true, onEdit, onDelete, onPageChange }: MovementListProps) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="-mx-2 flex flex-col divide-y">
        {page.content.map(movement => {
          const meaning = MOVEMENT_TYPE[movement.type];
          const cash = movementCash(movement);
          const name = names.get(movement.investmentId) ?? 'Aplicação';
          const subject = `${meaning.label} de ${format(parseISO(movement.occurredOn), 'dd/MM/yyyy')}${showInvestment ? ` em ${name}` : ''}`;
          return (
            <li key={movement.id} className="flex items-center gap-3 px-2 py-2.5">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="min-w-0 break-words text-sm font-medium">{showInvestment ? name : meaning.label}</span>
                  <Badge variant="outline" className="shrink-0 font-normal">
                    {movement.type === 'INCOME' ? 'Receita' : 'Transferência'}
                  </Badge>
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {showInvestment && `${meaning.label} · `}{format(parseISO(movement.occurredOn), 'dd/MM/yyyy')}
                  {movement.description && ` · ${movement.description}`}
                </span>
              </span>
              <span className={cn('shrink-0 text-sm font-medium tabular-nums', moneyCents(cash) < 0n ? 'text-negative' : 'text-positive')}
                aria-label={`${signed(cash)} no saldo disponível`}>
                {signed(cash)}
              </span>
              <span className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" className="h-10 w-10 md:h-8 md:w-8" aria-label={`Corrigir ${subject}`} onClick={() => onEdit(movement)}>
                  <Pencil aria-hidden className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-10 w-10 md:h-8 md:w-8" aria-label={`Excluir ${subject}`} onClick={() => onDelete(movement)}>
                  <Trash2 aria-hidden className="size-4 text-muted-foreground" />
                </Button>
              </span>
            </li>
          );
        })}
      </ul>
      {page.totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" className="max-md:h-10" disabled={page.first} onClick={() => onPageChange(page.number - 1)}
            aria-label="Movimentos mais recentes">
            <ChevronLeft aria-hidden className="size-4" /><span className="max-sm:sr-only">Anteriores</span>
          </Button>
          <span className="text-sm tabular-nums text-muted-foreground">Página {page.number + 1} de {page.totalPages}</span>
          <Button variant="outline" size="sm" className="max-md:h-10" disabled={page.last} onClick={() => onPageChange(page.number + 1)}
            aria-label="Movimentos mais antigos">
            <span className="max-sm:sr-only">Próximos</span><ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
