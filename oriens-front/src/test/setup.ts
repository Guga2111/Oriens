import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom não implementa matchMedia. Resolvemos min/max-width a partir de
// window.innerWidth (1024 por padrão) para que componentes que trocam de
// layout por breakpoint continuem determinísticos nos testes.
function matchesMediaQuery(query: string): boolean {
  const width = window.innerWidth || 1024;
  const min = query.match(/min-width:\s*(\d+)px/);
  if (min) return width >= Number(min[1]);
  const max = query.match(/max-width:\s*(\d+)px/);
  if (max) return width <= Number(max[1]);
  return false;
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: matchesMediaQuery(query),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList,
});

// jsdom não implementa ResizeObserver / IntersectionObserver.
class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
vi.stubGlobal("ResizeObserver", ObserverStub);
vi.stubGlobal("IntersectionObserver", ObserverStub);

// jsdom não implementa scrollIntoView.
Element.prototype.scrollIntoView = () => {};

// jsdom não implementa reprodução de áudio (useSound).
HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
HTMLMediaElement.prototype.load = () => {};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  try {
    window.localStorage?.clear();
  } catch {
    // jsdom/Node pode não expor localStorage; nenhum teste depende dele.
  }
});
