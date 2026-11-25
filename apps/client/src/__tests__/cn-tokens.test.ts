import { expect, it } from 'vitest';
import { cn } from '@/lib/utils';

it('troca tokens próprios de espaçamento e tamanho em vez de acumular', () => {
  expect(cn('px-overlay py-6', 'p-0')).toBe('p-0');
  expect(cn('h-6', 'h-app-header')).toBe('h-app-header');
  expect(cn('text-xl text-foreground', 'text-page-title')).toBe('text-foreground text-page-title');
});
