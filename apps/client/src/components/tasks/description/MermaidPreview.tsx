import DOMPurify from 'dompurify';
import mermaid from 'mermaid';
import { useEffect, useState } from 'react';

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'sandbox',
  htmlLabels: false,
  maxTextSize: 10_000,
  maxEdges: 100,
  suppressErrorRendering: true,
});

const unsupportedConfiguration = /^\s*---\s*$|%%\s*\{|^\s*click\b|\b(?:https?|data|file|javascript|blob):|\b(?:img|image|icon)\s*:|url\s*\(|@import/im;
let nextDiagramId = 0;

export default function MermaidPreview({ source }: { source: string }) {
  const [result, setResult] = useState<{ url?: string; failed?: boolean }>({});
  useEffect(() => {
    let active = true;
    let url: string | undefined;
    setResult({});
    if (!source.trim()) return;
    async function render() {
      try {
        if (source.length > 10_000 || unsupportedConfiguration.test(source)) throw new Error('Unsupported diagram configuration');
        const { svg } = await mermaid.render(`oriens-diagram-${++nextDiagramId}`, source);
        if (!active) return;
        // Mermaid returns a sandboxed iframe. Keep its SVG as an inert image.
        const encoded = svg.match(/src="data:text\/html;charset=UTF-8;base64,([\w+/=]+)"/)?.[1];
        if (!encoded) throw new Error('Empty diagram');
        const html = new TextDecoder().decode(Uint8Array.from(atob(encoded), char => char.charCodeAt(0)));
        const image = DOMPurify.sanitize(html, {
          USE_PROFILES: { svg: true, svgFilters: true },
          FORBID_TAGS: ['foreignObject', 'a', 'image'],
          FORBID_ATTR: ['href', 'xlink:href'],
        });
        if (!image.includes('<svg')) throw new Error('Empty SVG');
        url = URL.createObjectURL(new Blob([image], { type: 'image/svg+xml' }));
        setResult({ url });
      } catch {
        if (active) setResult({ failed: true });
      }
    }
    const timer = window.setTimeout(() => void render(), 250);
    return () => { active = false; window.clearTimeout(timer); if (url) URL.revokeObjectURL(url); };
  }, [source]);

  if (result.failed) return <p role="status" className="text-sm text-muted-foreground">Não foi possível renderizar o diagrama. Revise o código Mermaid.</p>;
  if (result.url) return <img className="description-diagram" src={result.url} alt="Diagrama Mermaid" />;
  return <p className="text-sm text-muted-foreground">{source.trim() ? 'Gerando diagrama…' : 'Digite o código Mermaid.'}</p>;
}
