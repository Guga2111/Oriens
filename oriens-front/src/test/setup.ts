import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom não implementa matchMedia (usado pelo useIsMobile do sidebar.tsx).
// Sempre "desktop": em teste de componente queremos o shell desktop.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: false,
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
