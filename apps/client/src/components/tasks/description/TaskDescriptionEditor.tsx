import { type Editor } from '@tiptap/core';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import {
  Bold, Code, Italic, Link2, Paintbrush, Strikethrough, Table2, Underline, type LucideIcon,
} from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { workError } from '@/lib/work-form';
import { taskService, type TaskMediaKind } from '@/services/taskService';
import type { TaskDescriptionDocument } from '@/types/work';
import { DescriptionContext, descriptionExtensions } from './descriptionBlocks';
import { descriptionDocument, descriptionTones, httpsUrl } from './descriptionContent';
import { DescriptionDragHandle, InsertBlockButton, MoveCurrentBlock, slashCommands } from './DescriptionBlockMenu';
import './task-description.css';

interface Props {
  taskId: number;
  document: TaskDescriptionDocument;
  editable?: boolean;
  autoFocus?: boolean;
  onChange?: (document: TaskDescriptionDocument | null) => void;
  onExit?: () => void;
}

export function TaskDescriptionEditor({ taskId, document, editable = false, autoFocus = false, onChange, onExit }: Props) {
  const [media, setMedia] = useState<TaskMediaKind | null>(null);
  const callbacks = useRef({ onChange, onExit });
  callbacks.current = { onChange, onExit };
  const extensions = useMemo(() => [...descriptionExtensions, slashCommands(setMedia)], []);
  const editor = useEditor({
    extensions,
    editable,
    content: document.content,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: editable ? {
        role: 'textbox', 'aria-label': 'Descrição', 'aria-multiline': 'true', 'data-description-input': '',
      } : { role: 'document', 'aria-label': 'Conteúdo da descrição' },
      handleKeyDown: (view, event) => {
        // GFM cells hold one paragraph. Tab moves through them via the table extension.
        if (event.key === 'Enter') {
          const { $from } = view.state.selection;
          for (let depth = $from.depth; depth > 0; depth--) {
            if ($from.node(depth).type.spec.tableRole === 'cell' || $from.node(depth).type.spec.tableRole === 'header_cell') {
              event.preventDefault();
              return true;
            }
          }
        }
        return false;
      },
    },
    onUpdate({ editor }) {
      const { doc } = editor.state;
      const empty = doc.childCount === 1 && doc.firstChild?.type.name === 'paragraph' && !doc.firstChild.childCount;
      callbacks.current.onChange?.(empty ? null : descriptionDocument(editor.getJSON()));
    },
  }, [editable, taskId]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !editor.schema) return;
    const incoming = editor.schema.nodeFromJSON(document.content);
    if (!incoming.eq(editor.state.doc)) editor.commands.setContent(incoming, { emitUpdate: false });
  }, [document, editor]);

  useEffect(() => {
    if (autoFocus && editor && !editor.isDestroyed) editor.commands.focus('start', { scrollIntoView: false });
  }, [autoFocus, editor]);

  return <DescriptionContext.Provider value={{ taskId, editable }}>
    <div className="task-description min-w-0" data-description-editing={editable ? '' : undefined}
      onKeyDown={event => {
        if (event.key !== 'Escape' || !editable) return;
        if (media) { event.preventDefault(); setMedia(null); editor?.commands.focus(); return; }
        if (callbacks.current.onExit) { event.preventDefault(); callbacks.current.onExit(); }
      }}>
      {editable && editor && <div className="flex flex-wrap items-center gap-1 border-b pb-1">
        <InsertBlockButton editor={editor} openMedia={setMedia} />
        <MoveCurrentBlock editor={editor} />
        <TableActions editor={editor} />
      </div>}
      {media && editor && <MediaInput key={media} kind={media} taskId={taskId} onCancel={() => { setMedia(null); editor.commands.focus(); }}
        onAdd={attributes => {
          if (editor.isDestroyed) return;
          editor.chain().focus().insertContent({
            type: 'paragraph', content: [{ type: 'media', attrs: attributes }],
          }).run();
          setMedia(null);
        }} />}
      <EditorContent editor={editor} className={editable ? 'description-editor' : 'description-reader'} />
      {editable && editor && <>
        <DescriptionDragHandle editor={editor} />
        <FormattingMenu editor={editor} />
      </>}
    </div>
  </DescriptionContext.Provider>;
}

const formats: Array<{ mark: string; label: string; icon: LucideIcon }> = [
  { mark: 'bold', label: 'Negrito', icon: Bold },
  { mark: 'italic', label: 'Itálico', icon: Italic },
  { mark: 'underline', label: 'Sublinhado', icon: Underline },
  { mark: 'strike', label: 'Tachado', icon: Strikethrough },
  { mark: 'code', label: 'Código em linha', icon: Code },
];

function FormattingMenu({ editor }: { editor: Editor }) {
  const active = useEditorState({ editor, selector: ({ editor }) =>
    Object.fromEntries(formats.map(({ mark }) => [mark, editor.isActive(mark)])),
  });
  return <BubbleMenu editor={editor} options={{ placement: 'top', offset: 8, shift: { padding: 8 }, flip: true }}
    className="z-50 max-w-[calc(100vw-1rem)] rounded-md border bg-popover p-1 text-popover-foreground shadow-md" data-description-editing>
    <div role="toolbar" aria-label="Formatação da descrição" className="flex flex-wrap items-center">
      {formats.map(({ mark, label, icon: Icon }) => <Button key={mark} type="button" variant={active[mark] ? 'secondary' : 'ghost'}
        size="icon" className="size-8" aria-label={label} aria-pressed={active[mark]}
        onMouseDown={event => event.preventDefault()} onClick={() => editor.chain().focus().toggleMark(mark).run()}>
        <Icon aria-hidden />
      </Button>)}
      <LinkControl editor={editor} />
      <ToneControl editor={editor} />
    </div>
  </BubbleMenu>;
}

function LinkControl({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const id = useId();
  const valid = httpsUrl(value.trim());
  function commit() {
    if (!valid) return;
    setOpen(false);
    editor.chain().focus().extendMarkRange('link').setLink({ href: valid.href }).run();
  }
  return <Popover open={open} onOpenChange={next => { if (next) setValue(editor.getAttributes('link').href ?? ''); setOpen(next); }}>
    <PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Link"
      onMouseDown={event => event.preventDefault()}><Link2 aria-hidden /></Button></PopoverTrigger>
    <PopoverContent align="end" data-description-editing className="w-64 space-y-2"
      onCloseAutoFocus={event => { event.preventDefault(); editor.commands.focus(); }}>
      <Field><FieldLabel htmlFor={id}>URL do link</FieldLabel><Input id={id} type="url" value={value}
        placeholder="https://" maxLength={2048} onChange={event => setValue(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); commit(); } }} /></Field>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => { setOpen(false); editor.chain().focus().extendMarkRange('link').unsetLink().run(); }}>Remover</Button>
        <Button type="button" size="sm" onClick={commit} disabled={!valid}>Aplicar</Button>
      </div>
    </PopoverContent>
  </Popover>;
}

function ToneControl({ editor }: { editor: Editor }) {
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="size-8"
      aria-label="Cor e marca-texto" onMouseDown={event => event.preventDefault()}><Paintbrush aria-hidden /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" data-description-editing>
      {(['textTone', 'highlightTone'] as const).map(mark => <div key={mark} role="group" aria-label={mark === 'textTone' ? 'Cor do texto' : 'Marca-texto'}>
        <p className="px-2 py-1 text-xs text-muted-foreground">{mark === 'textTone' ? 'Cor do texto' : 'Marca-texto'}</p>
        {descriptionTones.map(([tone, label]) => <DropdownMenuItem key={tone}
          onSelect={() => editor.chain().focus().setMark(mark, { tone }).run()}>
          <span className="font-semibold" {...(mark === 'textTone' ? { 'data-description-tone': tone } : { 'data-description-highlight': tone })}>Aa</span>
          {label}
        </DropdownMenuItem>)}
        <DropdownMenuItem onSelect={() => editor.chain().focus().unsetMark(mark).run()}>Remover {mark === 'textTone' ? 'cor' : 'marca-texto'}</DropdownMenuItem>
      </div>)}
    </DropdownMenuContent>
  </DropdownMenu>;
}

function TableActions({ editor }: { editor: Editor }) {
  const table = useEditorState({ editor, selector: ({ editor }) => editor.isActive('table') });
  if (!table) return null;
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="sm"><Table2 aria-hidden />Tabela</Button></DropdownMenuTrigger>
    <DropdownMenuContent align="start" data-description-editing>
      <DropdownMenuItem onSelect={() => editor.chain().focus().addRowAfter().run()}>Adicionar linha abaixo</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => editor.chain().focus().addColumnAfter().run()}>Adicionar coluna à direita</DropdownMenuItem>
      <DropdownMenuItem disabled={editor.isActive('tableHeader')} onSelect={() => editor.chain().focus().deleteRow().run()}>Excluir linha</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => editor.chain().focus().deleteColumn().run()}>Excluir coluna</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => editor.chain().focus().deleteTable().run()}>Excluir tabela</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}

function MediaInput({ kind, taskId, onAdd, onCancel }: {
  kind: TaskMediaKind; taskId: number;
  onAdd: (attributes: { kind: TaskMediaKind; label: string; src: string }) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [mode, setMode] = useState<'file' | 'url'>(taskId > 0 ? 'file' : 'url');
  const [label, setLabel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const image = kind === 'image';
  const limit = image ? 2 : 20;
  const address = httpsUrl(url.trim());
  async function insert() {
    setError('');
    if (!label.trim()) return;
    if (mode === 'url') {
      if (address) onAdd({ kind, label: label.trim(), src: address.href });
      return;
    }
    if (!file) return;
    if (file.size > limit * 1024 * 1024) { setError(`Selecione um arquivo de até ${limit} MiB.`); return; }
    setBusy(true);
    try {
      const uploaded = await taskService.uploadAttachment(taskId, kind, file);
      onAdd({ kind, label: label.trim(), src: `oriens-attachment:${uploaded.id}` });
    } catch (error) {
      setError(workError(error));
    } finally { setBusy(false); }
  }

  return <div className="my-2 space-y-3 rounded-md border p-3" role="group" aria-label={image ? 'Inserir imagem' : 'Inserir vídeo'}>
    <div className="flex gap-1">
      {taskId > 0 && <Button type="button" size="sm" variant={mode === 'file' ? 'secondary' : 'ghost'}
        aria-pressed={mode === 'file'} disabled={busy} onClick={() => setMode('file')}>Arquivo</Button>}
      <Button type="button" size="sm" variant={mode === 'url' ? 'secondary' : 'ghost'}
        aria-pressed={mode === 'url'} disabled={busy} onClick={() => setMode('url')}>Link HTTPS</Button>
    </div>
    <Field>
      <FieldLabel htmlFor={`${id}-label`}>{image ? 'Texto alternativo' : 'Nome do vídeo'}</FieldLabel>
      <Input id={`${id}-label`} value={label} autoFocus maxLength={300} disabled={busy} onChange={event => setLabel(event.target.value)} />
    </Field>
    {mode === 'file' ? <Field>
      <FieldLabel htmlFor={`${id}-source`}>Arquivo de até {limit} MiB</FieldLabel>
      <Input id={`${id}-source`} type="file" accept={image ? 'image/jpeg,image/png,image/gif,image/webp' : 'video/mp4,video/webm'}
        disabled={busy} onChange={event => setFile(event.target.files?.[0] ?? null)} />
    </Field> : <Field>
      <FieldLabel htmlFor={`${id}-source`}>Endereço</FieldLabel>
      <Input id={`${id}-source`} type="url" placeholder="https://" value={url} maxLength={2048}
        disabled={busy} onChange={event => setUrl(event.target.value)} />
    </Field>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy}>Cancelar</Button>
      <Button type="button" size="sm" onClick={() => void insert()} disabled={busy || !label.trim() || (mode === 'file' ? !file : !address)}>
        {busy ? 'Enviando…' : 'Inserir'}
      </Button>
    </div>
  </div>;
}
