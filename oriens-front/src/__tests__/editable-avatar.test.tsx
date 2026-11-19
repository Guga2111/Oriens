import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditableAvatar } from '@/components/common/EditableAvatar';

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

describe('foto de perfil', () => {
  // Regression: any image/* (including SVG, a scriptable document) was offered and sent to the API.
  it('aceita só JPG, PNG, GIF e WebP e recusa SVG antes do envio', () => {
    const changed = vi.fn();
    const { container } = render(<EditableAvatar fallback="P" alt="Foto de perfil" onImageChange={changed} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe('image/png,image/jpeg,image/gif,image/webp');
    fireEvent.change(input, { target: { files: [new File(['<svg onload="alert(1)"/>'], 'evil.svg', { type: 'image/svg+xml' })] } });
    expect(changed).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Erro', { description: 'Use uma imagem JPG, PNG, GIF ou WebP.' });
    fireEvent.change(input, { target: { files: [new File([new Uint8Array([0x89, 0x50])], 'me.png', { type: 'image/png' })] } });
    expect(changed).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Alterar foto de perfil' })).toBeInTheDocument();
  });
});
