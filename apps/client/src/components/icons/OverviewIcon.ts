import { createLucideIcon } from 'lucide-react';

/** A project's overview: a trend line over a baseline in a frame (plane.so's Overview). Drawn on lucide's 24px grid. */
export const OverviewIcon = createLucideIcon('Overview', [
  ['rect', { x: '3', y: '3', width: '18', height: '18', rx: '2', key: 'frame' }],
  ['path', { d: 'm7 12 3-3 3 2 4-4', key: 'trend' }],
  ['path', { d: 'M7 16h10', key: 'baseline' }],
]);
