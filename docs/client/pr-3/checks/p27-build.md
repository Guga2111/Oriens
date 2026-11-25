```text

> vite_react_shadcn_ts@0.0.0 build
> vite build

vite v5.4.19 building for production...
transforming...
Browserslist: browsers data (caniuse-lite) is 17 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme

warn - The class `duration-[120ms]` is ambiguous and matches multiple utilities.
warn - If this is content and not a class, replace it with `duration-&lsqb;120ms&rsqb;` to silence this warning.
✓ 3514 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                     2.82 kB │ gzip:   0.98 kB
dist/assets/index-B7WmtQZC.css     72.45 kB │ gzip:  13.16 kB
dist/assets/index-DHXn_9Qf.js   1,373.03 kB │ gzip: 383.83 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 1m 43s

```
