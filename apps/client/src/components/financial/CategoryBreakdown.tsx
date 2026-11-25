import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { TagTotal } from "@/lib/financialSummary";

interface CategoryBreakdownProps {
  categories: TagTotal[];
  monthName: string;
  onSelect: (tagId: number) => void;
}

/**
 * Despesas do mês por categoria. Cada linha é um botão que abre o histórico
 * filtrado pelo mês e pela categoria; a barra é só reforço visual do texto.
 */
export function CategoryBreakdown({ categories, monthName, onSelect }: CategoryBreakdownProps) {
  if (categories.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">Nenhuma despesa neste mês.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {categories.map((category) => (
        <li key={category.tagId}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onSelect(category.tagId)}
            aria-label={`${category.name}: ${formatCurrency(category.amount)}, ${category.percent}% das despesas. Ver lançamentos de ${monthName}.`}
            className="h-auto w-full flex-col items-stretch gap-1.5 whitespace-normal px-2 py-2 text-left font-normal max-md:min-h-11"
          >
            <span className="flex w-full items-center justify-between gap-3">
              <span className="truncate">{category.name}</span>
              <span className="shrink-0 tabular-nums">
                {formatCurrency(category.amount)}{" "}
                <span className="text-xs text-muted-foreground">· {category.percent}%</span>
              </span>
            </span>
            <span aria-hidden className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full"
                style={{ width: `${category.percent}%`, backgroundColor: category.color }}
              />
            </span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
