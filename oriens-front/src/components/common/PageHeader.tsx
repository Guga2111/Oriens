import type { ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner";
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
  /** Troca de dados mantendo o conteúdo anterior (SPEC §11.1). */
  isLoading?: boolean;
  className?: string;
}

/**
 * Cabeçalho padrão de toda rota autenticada: exatamente um `h1` por rota,
 * título em 20/28 no celular e 28/36 a partir de md (como no plane.so), e ações que nunca são cortadas.
 * Como no plane.so, título e ações dividem a primeira linha (centralizados);
 * descrição e meta ocupam a largura toda logo abaixo.
 */
export function PageHeader({
  title,
  description,
  meta,
  actions,
  isLoading = false,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 max-md:flex-col max-md:items-start">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-xl font-medium leading-7 text-foreground md:text-page-title">
            {title}
          </h1>
          {isLoading && (
            <Spinner
              aria-label="Atualizando"
              className="size-4 text-muted-foreground"
            />
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {actions}
          </div>
        )}
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {meta && <div className="text-sm text-muted-foreground">{meta}</div>}
    </div>
  );
}
