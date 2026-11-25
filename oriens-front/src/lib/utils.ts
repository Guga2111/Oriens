import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach the merger the project's own tokens (tailwind.config.ts) so an override like `p-0` replaces
// `px-overlay`, and `text-page-title` is read as a size, not a colour that would drop `text-foreground`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: { spacing: ["rail", "top-bar", "app-header", "page", "overlay"] },
    classGroups: { "font-size": [{ text: ["2xs", "page-title"] }] },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
