import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeltaProps {
  /** Variação percentual vinda do backend; `null` quando não se aplica. */
  change?: number | null;
  /**
   * Direção em que a variação é boa: `"up"` para métricas em que mais é
   * melhor (concluídas) e `"down"` para métricas em que menos é melhor
   * (atrasadas). A seta continua seguindo o sinal; só a cor usa isto (A10).
   */
  goodDirection: "up" | "down";
  className?: string;
}

function formatChange(change: number): string {
  const formatted = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(change);

  return change > 0 ? `+${formatted}%` : `${formatted}%`;
}

/**
 * Variação de um KPI (SPEC §11.6/A10). Zero e ausência de variação ficam
 * neutros em cinza; a cor nunca é decidida apenas pelo sinal do número.
 */
export function Delta({ change, goodDirection, className }: DeltaProps) {
  if (change === undefined || change === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium text-muted-foreground",
          className
        )}
        aria-label="Sem variação"
      >
        —
      </span>
    );
  }

  const isNeutral = change === 0;
  const isGood = goodDirection === "up" ? change > 0 : change < 0;
  const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        isNeutral
          ? "text-muted-foreground"
          : isGood
            ? "text-positive"
            : "text-negative",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {formatChange(change)}
    </span>
  );
}
