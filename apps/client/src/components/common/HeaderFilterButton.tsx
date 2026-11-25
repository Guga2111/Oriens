import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const HeaderFilterButton = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<"button"> & { count: number }>(
  ({ count, ...props }, ref) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button {...props} ref={ref} type="button" variant="ghost" size="icon" className="relative size-7 text-muted-foreground hover:text-foreground"
          aria-label={count ? `Filtros (${count} ${count === 1 ? "ativo" : "ativos"})` : "Filtros"}>
          <ListFilter aria-hidden />
          {count > 0 && <span aria-hidden className="absolute right-1 top-1 size-1.5 rounded-full bg-primary" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Filtros</TooltipContent>
    </Tooltip>
  )
);
HeaderFilterButton.displayName = "HeaderFilterButton";
