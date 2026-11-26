import { ArrowDown, ArrowDownUp, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TableHead } from "@/components/ui/table";

type Direction = "ASC" | "DESC";

export type ExploreOrder<Field extends string> = { sortBy: Field; direction: Direction };
export type ExploreSorting<Field extends string> = {
  order: ExploreOrder<Field>;
  onChange: (order: ExploreOrder<Field>) => void;
};

export type ExploreSortColumn<Field extends string> = {
  field: Field;
  label: string;
  className?: string;
  firstDirection?: Direction;
};

export function ExploreSortHead<Field extends string>({ column, sorting }: {
  column: ExploreSortColumn<Field>;
  sorting: ExploreSorting<Field>;
}) {
  const active = sorting.order.sortBy === column.field;
  const ascending = sorting.order.direction === "ASC";
  const Icon = active ? (ascending ? ArrowUp : ArrowDown) : ChevronsUpDown;
  const nextDirection = active ? (ascending ? "DESC" : "ASC") : (column.firstDirection ?? "ASC");
  return (
    <TableHead scope="col" className={column.className} aria-sort={active ? (ascending ? "ascending" : "descending") : undefined}>
      <Button type="button" variant="ghost" size="sm"
        className="min-h-8 w-full justify-between gap-1 px-0 text-left text-muted-foreground hover:bg-transparent focus-visible:ring-offset-0 active:scale-100 [&_svg]:size-3.5"
        onClick={() => sorting.onChange({ sortBy: column.field, direction: nextDirection })}>
        {column.label}<Icon aria-hidden />
      </Button>
    </TableHead>
  );
}

export function ExploreSortMenu<Field extends string>({ columns, sorting }: {
  columns: readonly ExploreSortColumn<Field>[];
  sorting: ExploreSorting<Field>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="self-end text-muted-foreground">
          <ArrowDownUp aria-hidden />Ordenar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sorting.order.sortBy}>
          {columns.map(column => (
            <DropdownMenuRadioItem key={column.field} value={column.field}
              onSelect={() => sorting.onChange({ sortBy: column.field, direction: column.firstDirection ?? "ASC" })}>
              {column.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={sorting.order.direction}>
          <DropdownMenuRadioItem value="ASC" onSelect={() => sorting.onChange({ ...sorting.order, direction: "ASC" })}>Crescente</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="DESC" onSelect={() => sorting.onChange({ ...sorting.order, direction: "DESC" })}>Decrescente</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
