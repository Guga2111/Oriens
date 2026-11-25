import { useQuery } from '@tanstack/react-query';
import { Mark, Node } from '@tiptap/core';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { common, createLowlight } from 'lowlight';
import { createContext, lazy, Suspense, useContext, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { taskService } from '@/services/taskService';
import { useAuth } from '@/context/AuthContext';
import { descriptionTones, httpsUrl } from './descriptionContent';

const attachmentPrefix = 'oriens-attachment:';
const MermaidPreview = lazy(() => import('./MermaidPreview'));
const lowlight = createLowlight(common);
export const DescriptionContext = createContext({ taskId: 0, editable: false });

const allowedTones = new Set<string>(descriptionTones.map(([tone]) => tone));

function toneMark(name: string, attribute: string) {
  return Mark.create({
    name,
    addAttributes: () => ({
      tone: {
        default: null,
        parseHTML: element => {
          const tone = element.getAttribute(attribute);
          return allowedTones.has(tone) ? tone : null;
        },
        renderHTML: ({ tone }) => allowedTones.has(tone) ? { [attribute]: tone } : {},
      },
    }),
    parseHTML: () => [{ tag: `span[${attribute}]` }],
    renderHTML: ({ HTMLAttributes }) => ['span', HTMLAttributes, 0],
  });
}

const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  parseHTML: () => [{ tag: 'aside[data-oriens-note]' }],
  renderHTML: () => ['aside', { 'data-oriens-note': '', role: 'note', 'aria-label': 'Nota' }, 0],
});

function ToggleBlock({ node, updateAttributes }: ReactNodeViewProps) {
  const { editable } = useContext(DescriptionContext);
  const [open, setOpen] = useState(editable);
  const id = useId();
  const title = node.attrs.title as string;
  return <NodeViewWrapper className="description-toggle">
    <div contentEditable={false} className="flex items-center gap-1">
      <Button type="button" variant="ghost" size={editable ? 'icon' : 'sm'} className={cn('max-w-full justify-start', editable && 'size-8')}
        aria-controls={id} aria-expanded={open} aria-label={editable ? (open ? 'Recolher bloco' : 'Expandir bloco') : undefined}
        onClick={() => setOpen(value => !value)}>
        {open ? <ChevronDown aria-hidden /> : <ChevronRight aria-hidden />}
        {!editable && <span className="truncate">{title}</span>}
      </Button>
      {editable && <Input aria-label="Título do bloco recolhível" value={title} maxLength={200}
        onChange={event => updateAttributes({ title: event.target.value })} className="h-8 min-w-0" />}
    </div>
    <NodeViewContent id={id} className={cn('px-4', !open && 'hidden')} />
  </NodeViewWrapper>;
}

const Toggle = Node.create({
  name: 'details',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes: () => ({ title: {
    default: 'Detalhes',
    parseHTML: element => element.getAttribute('data-oriens-toggle') || 'Detalhes',
    renderHTML: ({ title }) => ({ 'data-oriens-toggle': title }),
  } }),
  parseHTML: () => [{ tag: 'div[data-oriens-toggle]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', HTMLAttributes, 0],
  addNodeView: () => ReactNodeViewRenderer(ToggleBlock),
});

function MediaBlock({ node, selected, updateAttributes }: ReactNodeViewProps) {
  const { taskId, editable } = useContext(DescriptionContext);
  const { userId } = useAuth();
  const { kind, label, src } = node.attrs as { kind: 'image' | 'video'; label: string; src: string };
  const attachment = src?.startsWith(attachmentPrefix) ? src.slice(attachmentPrefix.length) : null;
  const link = useQuery({
    queryKey: ['work', userId, 'task-attachment', taskId, attachment],
    enabled: userId !== null && taskId > 0 && !!attachment,
    queryFn: ({ signal }) => taskService.attachmentLink(taskId, attachment!, signal),
    staleTime: 240_000,
    refetchInterval: 240_000,
  });
  const external = attachment ? null : httpsUrl(src);
  const url = attachment ? link.data?.url : external?.href;
  const directVideo = attachment || (external && /\.(mp4|webm)$/i.test(external.pathname));
  const caption = kind === 'image' ? 'Texto alternativo' : 'Nome do vídeo';
  return <NodeViewWrapper as="span" contentEditable={false} className={cn('description-media', selected && 'ring-2 ring-ring')}>
    {url && kind === 'image' && <img alt={label} src={url} loading="lazy" referrerPolicy="no-referrer" />}
    {url && kind === 'video' && (directVideo
      ? <video aria-label={label} src={url} controls preload="metadata" />
      : <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
          {label} <ExternalLink className="size-3" aria-hidden />
        </a>)}
    {!url && <span className="block text-sm text-muted-foreground" role="status">
      {link.isFetching ? 'Carregando anexo…' : label}
    </span>}
    {link.isError && <Button type="button" variant="ghost" size="sm" onClick={() => void link.refetch()}>Recarregar anexo</Button>}
    {editable && selected && <Input aria-label={caption} value={label} maxLength={300} className="mt-2 h-8"
      onChange={event => updateAttributes({ label: event.target.value })} />}
  </NodeViewWrapper>;
}

const Media = Node.create({
  name: 'media',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes: () => ({ kind: { default: 'image' }, label: { default: '' }, src: { default: '' } }),
  renderHTML: ({ node }) => ['span', {}, node.attrs.label],
  addNodeView: () => ReactNodeViewRenderer(MediaBlock),
});

// Instantiate the generic outside JSX: the dev tagger plugin cannot parse JSX type arguments.
const CodeContent = NodeViewContent<'code'>;

function CodeBlock({ node, updateAttributes }: ReactNodeViewProps) {
  const { editable } = useContext(DescriptionContext);
  const language = node.attrs.language as string | null;
  const isDiagram = language === 'mermaid';
  const source = node.textContent;
  const languages = useId();
  return <NodeViewWrapper className="description-code">
    {editable && <div contentEditable={false} className="flex items-center gap-2 p-2">
      <Input aria-label="Linguagem do código" placeholder="Linguagem" list={languages}
        value={language ?? ''} maxLength={60} className="h-8 w-48 font-mono text-xs"
        onChange={event => updateAttributes({ language: event.target.value || null })} />
      <datalist id={languages}>{['mermaid', ...lowlight.listLanguages()].map(value => <option key={value} value={value} />)}</datalist>
    </div>}
    <pre className={cn(isDiagram && !editable && 'hidden')}><CodeContent as="code" /></pre>
    {isDiagram && <div contentEditable={false} className="p-2">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando diagrama…</p>}>
        <MermaidPreview source={source} />
      </Suspense>
      {!editable && <details className="text-sm">
        <summary className="cursor-pointer">Código do diagrama</summary>
        <pre><code>{source}</code></pre>
      </details>}
    </div>}
  </NodeViewWrapper>;
}

const cellAlignment = {
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute('data-align'),
  renderHTML: ({ align }: { align?: string }) => ['left', 'center', 'right'].includes(align) ? { 'data-align': align } : {},
};

export const descriptionExtensions = [
  StarterKit.configure({
    codeBlock: false,
    trailingNode: false,
    link: { isAllowedUri: input => Boolean(httpsUrl(input)), openOnClick: 'whenNotEditable',
      HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } },
  }).extend({
    addExtensions() {
      return this.parent?.().map(extension => extension.name === 'link'
        ? extension.extend({
          addAttributes() {
            return { ...this.parent?.(), title: { default: null, parseHTML: element => element.getAttribute('title') } };
          },
        })
        : extension) ?? [];
    },
  }),
  Placeholder.configure({ placeholder: "Digite / para inserir um bloco…" }),
  TaskList,
  TaskItem.configure({
    nested: true,
    a11y: { checkboxLabel: node => node.textContent ? `Marcar tarefa: ${node.textContent}` : 'Marcar tarefa' },
  }),
  Table.configure({ renderWrapper: true, allowTableNodeSelection: true }),
  TableRow,
  TableHeader.extend({ content: 'paragraph', addAttributes() { return { ...this.parent?.(), align: cellAlignment }; } }),
  TableCell.extend({ content: 'paragraph', addAttributes() { return { ...this.parent?.(), align: cellAlignment }; } }),
  CodeBlockLowlight.configure({ lowlight }).extend({ addNodeView: () => ReactNodeViewRenderer(CodeBlock) }),
  Callout, Toggle, Media,
  toneMark('textTone', 'data-description-tone'),
  toneMark('highlightTone', 'data-description-highlight'),
];
