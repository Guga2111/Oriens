import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Vira o único `h1` da rota (SPEC §13.2 A1). */
  title: ReactNode;
  /** Frase de contexto abaixo do título. */
  description?: ReactNode;
  /** Período, frescor ou controles alinhados ao título. */
  meta?: ReactNode;
  /** Ações da tela. Em <768px quebram para uma segunda linha (SPEC R3). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Cabeçalho padrão de toda rota autenticada: exatamente um `h1` por rota,
 * título em 24/32 (SPEC §9.2) e ações que nunca são cortadas.
 */
export function PageHeader({
  title,
  description,
  meta,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 md:flex-row md:items-start md:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold leading-8 text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
        {meta && <div className="mt-2 text-sm text-muted-foreground">{meta}</div>}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
