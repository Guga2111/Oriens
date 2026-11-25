import { Extension, type Editor } from '@tiptap/core';
import { Selection } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { type SuggestionProps } from '@tiptap/suggestion';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import {
  ArrowDown, ArrowUp, ChevronRight, CodeXml, GitFork, GripVertical, Heading, Image, List, ListChecks,
  ListOrdered, Minus, Plus, Quote, StickyNote, Table, Type, Video, type LucideIcon,
} from 'lucide-react';
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { TaskMediaKind } from '@/services/taskService';

type MediaRequest = (kind: TaskMediaKind) => void;
type Group = 'Básicos' | 'Listas' | 'Layout e mídia';
type Level = 1 | 2 | 3 | 4 | 5 | 6;
type Action = { label: string; group: Group; icon: LucideIcon; hints?: string; apply: (editor: Editor, media: MediaRequest) => void };

const levels: Level[] = [1, 2, 3, 4, 5, 6];
const groups: Group[] = ['Básicos', 'Listas', 'Layout e mídia'];
const actions: Action[] = [
  { label: 'Texto', group: 'Básicos', icon: Type, hints: 'parágrafo', apply: editor => { editor.chain().focus().clearNodes().setParagraph().run(); } },
  ...levels.map<Action>(level => ({ label: `Título ${level}`, group: 'Básicos', icon: Heading, hints: `heading h${level}`,
    apply: editor => { editor.chain().focus().clearNodes().setHeading({ level }).run(); } })),
  { label: 'Citação', group: 'Básicos', icon: Quote, hints: 'quote', apply: editor => { editor.chain().focus().toggleBlockquote().run(); } },
  { label: 'Nota em destaque', group: 'Básicos', icon: StickyNote, hints: 'callout aviso', apply: editor => { editor.chain().focus().toggleWrap('callout').run(); } },
  { label: 'Recolhível', group: 'Básicos', icon: ChevronRight, hints: 'toggle detalhes', apply: editor => { editor.chain().focus().toggleWrap('details').run(); } },
  { label: 'Divisor', group: 'Básicos', icon: Minus, hints: 'separador', apply: editor => { editor.chain().focus().setHorizontalRule().run(); } },
  { label: 'Lista numerada', group: 'Listas', icon: ListOrdered, apply: editor => { editor.chain().focus().toggleOrderedList().run(); } },
  { label: 'Lista com marcadores', group: 'Listas', icon: List, hints: 'bullet', apply: editor => { editor.chain().focus().toggleBulletList().run(); } },
  { label: 'Lista de tarefas', group: 'Listas', icon: ListChecks, hints: 'to-do checkbox checklist', apply: editor => { editor.chain().focus().toggleTaskList().run(); } },
  { label: 'Tabela', group: 'Layout e mídia', icon: Table, apply: editor => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); } },
  { label: 'Imagem', group: 'Layout e mídia', icon: Image, hints: 'foto anexo', apply: (_, media) => media('image') },
  { label: 'Vídeo', group: 'Layout e mídia', icon: Video, hints: 'mp4 webm anexo', apply: (_, media) => media('video') },
  { label: 'Bloco de código', group: 'Layout e mídia', icon: CodeXml, hints: 'linguagem', apply: editor => { editor.chain().focus().clearNodes().setCodeBlock().run(); } },
  { label: 'Diagrama Mermaid', group: 'Layout e mídia', icon: GitFork, hints: 'fluxograma', apply: editor => {
    editor.chain().focus().clearNodes().setCodeBlock({ language: 'mermaid' }).run();
  } },
];
const searchable = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');

function Choices({ items, onSelect }: { items: Action[]; onSelect: (action: Action) => void }) {
  return <CommandList>
    <CommandEmpty>Nenhum bloco encontrado.</CommandEmpty>
    {groups.map(group => {
      const choices = items.filter(item => item.group === group);
      return choices.length > 0 && <CommandGroup key={group} heading={group}>
        {choices.map(item => <CommandItem key={item.label} value={item.label}
          keywords={item.hints?.split(' ')} onSelect={() => onSelect(item)} onMouseDown={event => event.preventDefault()}>
          <item.icon aria-hidden />{item.label}
        </CommandItem>)}
      </CommandGroup>;
    })}
  </CommandList>;
}

type SlashProps = SuggestionProps<Action, Action>;
type SlashKeys = { keyDown: (event: KeyboardEvent) => boolean };
const SlashMenu = forwardRef<SlashKeys, SlashProps>(function SlashMenu({ items, command }, ref) {
  const [selected, setSelected] = useState('');
  const index = Math.max(0, items.findIndex(item => item.label === selected));
  useImperativeHandle(ref, () => ({
    keyDown(event) {
      if (event.key === 'Enter' && items[index]) { command(items[index]); return true; }
      if ((event.key !== 'ArrowDown' && event.key !== 'ArrowUp') || !items.length) return false;
      const next = (index + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
      setSelected(items[next].label);
      return true;
    },
  }), [command, index, items]);
  return <Command aria-label="Inserir bloco" shouldFilter={false} value={items[index]?.label ?? ''}
    onValueChange={setSelected} className="w-64 rounded-md border bg-popover text-popover-foreground shadow-md">
    <Choices items={items} onSelect={command} />
  </Command>;
});

export function slashCommands(openMedia: MediaRequest) {
  return Extension.create({
    name: 'descriptionSlashCommands',
    addProseMirrorPlugins() {
      return [Suggestion<Action, Action>({
        editor: this.editor,
        char: '/',
        allowSpaces: true,
        allow: ({ editor }) => editor.isEditable && !editor.isActive('codeBlock') && !editor.isActive('table'),
        container: this.editor.options.element instanceof HTMLElement
          ? this.editor.options.element.closest<HTMLElement>('[role=dialog]') ?? undefined : undefined,
        items: ({ query }) => actions.filter(item => searchable(`${item.label} ${item.hints ?? ''}`).includes(searchable(query.trim()))),
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();
          props.apply(editor, openMedia);
        },
        render: () => {
          let component: ReactRenderer<SlashKeys, SlashProps>;
          let unmount: (() => void) | undefined;
          return {
            onStart: props => {
              component = new ReactRenderer(SlashMenu, { editor: props.editor, props, className: 'z-50' });
              component.element.setAttribute('data-description-editing', '');
              unmount = props.mount(component.element);
            },
            onUpdate: props => component.updateProps(props),
            onKeyDown: ({ event }) => {
              if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); return true; }
              return component?.ref?.keyDown(event) ?? false;
            },
            onExit: () => { unmount?.(); component?.destroy(); },
          };
        },
      })];
    },
  });
}

export function InsertBlockButton({ editor, openMedia }: { editor: Editor; openMedia: MediaRequest }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const items = actions.filter(item => searchable(`${item.label} ${item.hints ?? ''}`).includes(searchable(search.trim())));
  return <Popover open={open} onOpenChange={next => { setOpen(next); setSearch(''); }}>
    <PopoverTrigger asChild><Button type="button" variant="ghost" size="sm"><Plus aria-hidden />Inserir bloco</Button></PopoverTrigger>
    <PopoverContent className="w-64 p-0" align="start" data-description-editing onCloseAutoFocus={event => event.preventDefault()}>
      <Command aria-label="Inserir bloco" shouldFilter={false}>
        <CommandInput placeholder="Buscar bloco…" value={search} onValueChange={setSearch} />
        <Choices items={items} onSelect={item => { setOpen(false); item.apply(editor, openMedia); }} />
      </Command>
    </PopoverContent>
  </Popover>;
}

function moveBlock(editor: Editor, pos: number, direction: -1 | 1) {
  if (pos < 0 || pos >= editor.state.doc.content.size) return;
  const { doc, tr } = editor.state;
  const node = doc.nodeAt(pos);
  const resolved = doc.resolve(pos);
  const index = resolved.index();
  if (!node || index + direction < 0 || index + direction >= resolved.parent.childCount) return;
  const sibling = resolved.parent.child(index + direction);
  const next = pos + direction * sibling.nodeSize;
  const transaction = tr.delete(pos, pos + node.nodeSize).insert(next, node);
  editor.view.dispatch(transaction.setSelection(Selection.near(transaction.doc.resolve(next + 1))).scrollIntoView());
  editor.commands.focus();
}

export function DescriptionDragHandle({ editor }: { editor: Editor }) {
  return <DragHandle editor={editor} nested className="description-grip"
    onElementDragStart={() => editor.view.dom.classList.add('description-dragging')}
    onElementDragEnd={() => editor.view.dom.classList.remove('description-dragging')}>
    <span aria-hidden className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
      <GripVertical className="size-4" />
    </span>
  </DragHandle>;
}

export function MoveCurrentBlock({ editor }: { editor: Editor }) {
  const move = (direction: -1 | 1) => {
    const { $from } = editor.state.selection;
    moveBlock(editor, $from.depth > 0 ? $from.before(1) : $from.pos, direction);
  };
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="sm"><GripVertical aria-hidden />Mover bloco</Button></DropdownMenuTrigger>
    <DropdownMenuContent align="start" data-description-editing>
      <DropdownMenuItem onSelect={() => move(-1)}><ArrowUp aria-hidden />Mover para cima</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => move(1)}><ArrowDown aria-hidden />Mover para baixo</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
