import { useId, type ReactNode } from "react";

interface SettingsSectionProps {
  /** Título da seção (`h2` da rota). */
  title: string;
  description?: string;
  /** Linhas de configuração (rótulo, descrição e controle). */
  children: ReactNode;
}

/**
 * Seção de configuração (SPEC §11.8): um bloco com `h2` e linhas de
 * configuração, sem ícone decorativo à esquerda.
 */
export function SettingsSection({
  title,
  description,
  children,
}: SettingsSectionProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div>
        <h2 id={headingId} className="text-base font-semibold">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="divide-y rounded-lg border bg-card">{children}</div>
    </section>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  /** Controle à direita (switch, toggle group, texto ou ação). */
  children: ReactNode;
}

/** Linha de configuração: rótulo e descrição à esquerda, controle à direita. */
export function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
