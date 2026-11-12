import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  change?: number; // Percentage variation (12.5, 20.0, etc...)
  description: string;
  additionalDescription?: string;
  /**
   * Direção em que a variação é boa (A10): "up" para métricas onde mais é
   * melhor (concluídas) e "down" para onde menos é melhor (atrasadas).
   */
  goodDirection: "up" | "down";
}

/**
 * A10 (P0.3): a cor e a seta da variação seguem `goodDirection`, nunca o sinal
 * do número. Variação 0 fica neutra (cinza). Os textos narrativos continuam
 * vindo do backend como estão (D12).
 */
export function KpiCard({
  title,
  value,
  change,
  description,
  additionalDescription,
  goodDirection,
}: KpiCardProps) {
  const formatChange = (changeValue: number) => {
    const sign = changeValue > 0 ? "+" : "";

    if (changeValue === 100 || changeValue === 0) {
      return `${sign}${changeValue}%`;
    }
    else {
      return `${sign}${changeValue.toFixed(2)}%`;
    }
  };

  // null = neutro (0%); true = bom; false = ruim.
  const isGood: boolean | null =
    change === undefined || change === 0
      ? null
      : goodDirection === "up"
        ? change > 0
        : change < 0;

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>

       {change !== undefined && ( 
          <div
            className={cn(
              "flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs",
              isGood === null
                ? "text-muted-foreground"
                : isGood
                  ? "text-positive"
                  : "text-negative"
            )}
          >
            {change > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : change < 0 ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            <span>{formatChange(change)}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 space-y-1">
        <div className="text-2xl font-semibold">{value}</div>

        <p className="font-medium line-clamp-1">
          {description}
        </p>

        {additionalDescription && (
          <p className="text-xs text-muted-foreground">
            {additionalDescription}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
