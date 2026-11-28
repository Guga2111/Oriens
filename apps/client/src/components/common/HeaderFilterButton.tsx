import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { ListFilter } from "lucide-react";
import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const HeaderFilterButton = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<"button"> & { count: number; label?: string }>(
  ({ count, label = "Filtros", ...props }, ref) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button {...props} ref={ref} type="button" variant="ghost" size="icon" className="relative size-7 text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground"
          aria-label={count ? `${label} (${count} ${count === 1 ? "ativo" : "ativos"})` : label}>
          <ListFilter aria-hidden />
          {count > 0 && <span aria-hidden className={cn(badgeVariants(), "absolute -right-1 -top-0.5 flex h-4 min-w-4 justify-center px-0.5 py-0 tabular-nums")}>{count}</span>}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
);
HeaderFilterButton.displayName = "HeaderFilterButton";
