import { MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { WorkObjective } from '@/types/work';

export interface ObjectiveActionHandlers {
  onPin: (objective: WorkObjective) => void;
  onEdit: (objective: WorkObjective) => void;
  onDelete: (objective: WorkObjective) => void;
}

/** The ⋯ menu of an objective, the same in the list and in the gallery. */
export function ObjectiveMenu({ objective, disabled, onPin, onEdit, onDelete }: ObjectiveActionHandlers & { objective: WorkObjective; disabled?: boolean }) {
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" disabled={disabled} aria-label={`Ações do objetivo ${objective.title}`}><MoreHorizontal aria-hidden /></Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end"><DropdownMenuGroup>
      <DropdownMenuItem onSelect={() => onPin(objective)}>{objective.favorite ? <PinOff aria-hidden /> : <Pin aria-hidden />}{objective.favorite ? 'Desafixar' : 'Fixar'}</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onEdit(objective)}><Pencil aria-hidden />Editar objetivo</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onDelete(objective)}><Trash2 aria-hidden />Excluir objetivo</DropdownMenuItem>
    </DropdownMenuGroup></DropdownMenuContent>
  </DropdownMenu>;
}

/** Pin toggle of the gallery card; filled in the primary colour while pinned, as on the project cards. */
export function ObjectivePinButton({ objective, disabled, onPin }: { objective: WorkObjective; disabled?: boolean; onPin: (objective: WorkObjective) => void }) {
  return <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon" disabled={disabled} aria-label={`Fixar ${objective.title}`} aria-pressed={objective.favorite} onClick={() => onPin(objective)}>
        <Pin aria-hidden className={objective.favorite ? 'fill-current text-primary' : undefined} />
      </Button>
    </TooltipTrigger>
    <TooltipContent>{objective.favorite ? 'Desafixar' : 'Fixar'}</TooltipContent>
  </Tooltip>;
}
