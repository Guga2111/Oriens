import { cn } from "@/lib/utils";

interface OriensLogoProps {
  className?: string;
  /** Rótulo acessível; quando ausente, a marca é decorativa. */
  title?: string;
}

/**
 * Logo meio-sol do Oriens em SVG, usando os tokens da marca (SPEC §11.11/D5).
 * O sol é a metade de cima de um disco em `--brand-yellow`; o horizonte e as
 * linhas abaixo são `--brand-burgundy`.
 */
export function OriensLogo({ className, title }: OriensLogoProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("h-8 w-8", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <path d="M9 24a15 15 0 0 1 30 0Z" className="fill-brand-yellow" />
      <rect
        x="5"
        y="22.5"
        width="38"
        height="3"
        rx="1.5"
        className="fill-brand-burgundy"
      />
      <rect
        x="11"
        y="29"
        width="26"
        height="3"
        rx="1.5"
        className="fill-brand-burgundy"
      />
      <rect
        x="15"
        y="35.5"
        width="18"
        height="3"
        rx="1.5"
        className="fill-brand-burgundy"
      />
      <rect
        x="19"
        y="42"
        width="10"
        height="3"
        rx="1.5"
        className="fill-brand-burgundy"
      />
    </svg>
  );
}
