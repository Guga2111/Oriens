import { cn } from "@/lib/utils";

interface OriensLogoProps {
  className?: string;
  /** Rótulo acessível; quando ausente, a marca é decorativa. */
  title?: string;
}

/**
 * Logo do Oriens em SVG: um "O" cortado pelo horizonte. A metade de cima é o sol
 * (primário); a de baixo, o que ainda está sob a linha (cor do texto). Acompanha os
 * dois temas sem token próprio (docs/brand/GUIA-DE-USO.md).
 */
export function OriensLogo({ className, title }: OriensLogoProps) {
  return (
    <svg
      viewBox="32 32 192 192"
      className={cn("h-8 w-8", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M32.75 140A96 96 0 1 1 223.25 140L182.7 140A56 56 0 1 0 73.3 140Z"
        className="fill-primary"
      />
      <path
        d="M39.01 164A96 96 0 0 0 216.99 164L170.9 164A56 56 0 0 1 85.1 164Z"
        className="fill-foreground"
      />
    </svg>
  );
}
