import { useEffect, useState } from "react";

/**
 * Lê uma media query de forma síncrona no primeiro render (evita flicker em
 * layouts que trocam de componente por breakpoint). Em jsdom o `matchMedia`
 * é resolvido pelo setup dos testes a partir de `window.innerWidth`.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" || !window.matchMedia
      ? false
      : window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);

    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
