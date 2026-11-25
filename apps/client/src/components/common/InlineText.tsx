import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { Textarea } from "@/components/ui/textarea";
import { INLINE_EDIT_ATTRIBUTE } from "@/lib/inline-edit";
import { cn } from "@/lib/utils";

/**
 * Text edited where it is read, as in Notion or plane.so: no form and no save button. The field grows with
 * its text and saves the trimmed value when it loses focus; Escape restores the saved text. A single-line
 * field also saves on Enter; a multiline one keeps Enter for new lines and saves on Ctrl/⌘+Enter.
 */
export function InlineText({ value, onCommit, label, placeholder, maxLength, required, multiline, disabled, className }: {
  value: string; onCommit: (next: string) => Promise<boolean>; label: string; placeholder?: string; maxLength: number;
  required?: string; multiline?: boolean; disabled?: boolean; className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState("");
  const [synced, setSynced] = useState(value);

  // A save elsewhere (or a refetch) replaces the text, unless it is being edited right now.
  if (value !== synced) {
    setSynced(value);
    if (document.activeElement !== ref.current) setDraft(value);
  }

  useLayoutEffect(() => {
    const field = ref.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [draft]);

  const commit = async () => {
    const next = draft.trim();
    if (next === value) { setDraft(value); setError(""); return; }
    if (!next && required) { setDraft(value); setError(required); return; }
    setError("");
    // A failed save keeps the draft, so nothing typed is lost; the panel shows why it failed.
    if (await onCommit(next)) setDraft(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      // Render the reset before blurring, so the blur does not save the discarded draft.
      flushSync(() => { setDraft(value); setError(""); });
      event.currentTarget.blur();
    } else if (event.key === "Enter" && (!multiline || event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Textarea
        ref={ref} rows={1} {...{ [INLINE_EDIT_ATTRIBUTE]: "" }} aria-label={label} placeholder={placeholder} maxLength={maxLength}
        disabled={disabled} value={draft} aria-invalid={!!error || undefined}
        onChange={event => setDraft(multiline ? event.target.value : event.target.value.replace(/\n/g, " "))}
        onBlur={() => void commit()} onKeyDown={onKeyDown}
        className={cn(
          "-mx-1.5 min-h-0 w-auto resize-none overflow-hidden rounded-md border-transparent bg-transparent px-1.5 py-1",
          "hover:bg-accent/50 focus-visible:bg-transparent focus-visible:ring-1 focus-visible:ring-offset-0 disabled:cursor-default disabled:opacity-100",
          className,
        )}
      />
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
