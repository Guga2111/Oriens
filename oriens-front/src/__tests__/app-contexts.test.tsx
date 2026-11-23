import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppContextRail } from '@/components/layout/AppContextRail';
import { getAppContext } from '@/components/layout/app-contexts';
import { renderWork } from './work-fixtures';

describe('contextos do shell', () => {
  it.each([
    ['/tasks', 'work'], ['/tasks/', 'work'], ['/tasks/project/9', 'work'],
    ['/projects', 'work'], ['/all-data', 'work'], ['/financial', 'financial'],
    ['/financial/', 'financial'], ['/stats', 'statistics'], ['/config', 'settings'],
    ['/support', 'settings'], ['/admin/support', 'settings'], ['/admin/management', 'settings'],
    ['/admin/new-section', 'settings'], ['/financial-other', 'work'], ['/stats-other', 'work'],
    ['/administrator', 'work'],
  ])('resolve %s para %s sem confundir prefixos parciais', (path, id) => {
    expect(getAppContext(path).id).toBe(id);
  });

  it.each([
    ['/tasks/project/9', 'Trabalho'], ['/financial', 'Financeiro'],
    ['/stats', 'Estatísticas'], ['/support', 'Configurações'], ['/admin/support', 'Configurações'],
  ])('marca somente o contexto de %s e mantém Configurações no fim', (path, label) => {
    renderWork(<AppContextRail />, path);
    const rail = screen.getByRole('navigation', { name: 'Contextos' });
    const links = within(rail).getAllByRole('link');
    expect(links.map(link => link.textContent)).toEqual(['Trab.', 'Finan.', 'Estat.', 'Config.']);
    expect(within(rail).getByRole('link', { current: 'page' })).toHaveAccessibleName(label);
    expect(links[3]).toHaveAttribute('href', '/config');
  });
});
