import { createContext, useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Slot = { element: HTMLElement | null; register: (element: HTMLElement | null) => void };

const HeaderActionsContext = createContext<Slot | null>(null);

/** Shares the app header's action slot with the routed page below it. */
export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const [element, register] = useState<HTMLElement | null>(null);
  return <HeaderActionsContext.Provider value={{ element, register }}>{children}</HeaderActionsContext.Provider>;
}

/** The header's end slot; pages fill it through `HeaderActions`. */
export function HeaderActionsSlot() {
  const slot = useContext(HeaderActionsContext);
  return <div ref={slot?.register} className="flex shrink-0 items-center gap-2 empty:hidden" />;
}

/**
 * Renders a page's actions in the app header, next to the breadcrumb, as plane.so does.
 * Outside the shell (no provider) they stay where they are declared.
 */
export function HeaderActions({ children }: { children: ReactNode }) {
  const slot = useContext(HeaderActionsContext);
  if (!slot) return <>{children}</>;
  return slot.element ? createPortal(children, slot.element) : null;
}
