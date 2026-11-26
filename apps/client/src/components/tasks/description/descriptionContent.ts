import type { JSONContent } from '@tiptap/core';
import type { TaskDescriptionDocument, WorkTask } from '@/types/work';

export function httpsUrl(input: string) {
  try {
    const url = new URL(input);
    return url.protocol === 'https:' && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

export function descriptionDocument(content: JSONContent): TaskDescriptionDocument {
  return { schemaVersion: 1, content };
}

export const emptyDescription = descriptionDocument({ type: 'doc', content: [{ type: 'paragraph' }] });

export function taskDescription(task: WorkTask) {
  if (task.descriptionDoc) return task.descriptionDoc;
  const text = task.descriptionText ?? task.description ?? '';
  if (!text) return emptyDescription;
  const content = text.split(/\r\n|\r|\n/).flatMap<JSONContent>((line, index) => [
    ...(index > 0 ? [{ type: 'hardBreak' }] : []),
    ...(line ? [{ type: 'text', text: line }] : []),
  ]);
  return descriptionDocument({ type: 'doc', content: [{ type: 'paragraph', content }] });
}

export const descriptionTones = [
  ['red', 'Vermelho'], ['amber', 'Âmbar'], ['green', 'Verde'], ['blue', 'Azul'], ['violet', 'Violeta'],
] as const;
