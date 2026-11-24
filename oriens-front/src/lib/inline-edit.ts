/** Marks a field edited in place, so an enclosing dialog can tell it apart from the rest of its content. */
export const INLINE_EDIT_ATTRIBUTE = "data-inline-edit";

/** Lets an enclosing dialog skip its own Escape while an inline field is being edited. */
export const isEditingInline = () => document.activeElement?.hasAttribute(INLINE_EDIT_ATTRIBUTE) === true;
