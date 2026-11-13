import { Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Delta } from "@/components/common/Delta";
import { cn } from "@/lib/utils";

export interface KpiStripItem {
  /** Rótulo da métrica (o texto narrativo vem do backend). */
  label: string;
  value: string;
  change?: number | null;
  goodDirection: "up" | "down";
  /** `description` do backend, exibida sem alteração (D12). */
  description: string;
  /** `additionalDescription` do backend, exibida sem alteração (D12). */
  additionalDescription?: string;
}

interface KpiStripProps {
  items: KpiStripItem[];
  isLoading?: boolean;
  className?: string;
}

/**
 * Um único container com quatro colunas divididas por `Separator` (2×2 abaixo
 * de 768). Cada coluna tem rótulo de 14 px, valor de 24 px e `Delta`
 * (SPEC §11.6).
 */
export function KpiStrip({
  items,
  isLoading = false,
  className,
}: KpiStripProps) {
  const columns = isLoading
    ? Array.from({ length: 4 }, (_, index) => ({
        key: `skeleton-${index}`,
        item: null,
      }))
    : items.map((item) => ({ key: item.label, item }));

  return (
    <Card className={className}>
      <CardContent className="grid grid-cols-2 p-0 md:flex">
        {columns.map(({ key, item }, index) => (
          <Fragment key={key}>
            {index > 0 && (
              <Separator
                orientation="vertical"
                className="hidden md:block"
              />
            )}
            <div
              className={cn(
                "p-5",
                "md:flex-1",
                // 2×2 abaixo de 768: divisórias nas duas colunas e entre as
                // linhas; a partir de md as divisórias são os Separator.
                (index === 1 || index === 3) &&
                  "border-l border-border md:border-l-0",
                index >= 2 && "border-t border-border md:border-t-0"
              )}
            >
              {item ? (
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className="text-2xl font-semibold tabular-nums">
                      {item.value}
                    </p>
                    <Delta
                      change={item.change}
                      goodDirection={item.goodDirection}
                    />
                  </div>
                  <p className="text-sm text-foreground">{item.description}</p>
                  {item.additionalDescription && (
                    <p className="text-xs text-muted-foreground">
                      {item.additionalDescription}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              )}
            </div>
          </Fragment>
        ))}
      </CardContent>
    </Card>
  );
}
