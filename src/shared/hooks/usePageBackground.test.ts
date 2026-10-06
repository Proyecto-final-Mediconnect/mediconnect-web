// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePageBackground } from './usePageBackground';

const tema = () => document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

describe('usePageBackground', () => {
  it('pinta el documento y la barra del navegador mientras la pantalla está montada', () => {
    const { unmount } = renderHook(() => usePageBackground('#041d28'));

    expect(document.documentElement.style.backgroundColor).toBe('rgb(4, 29, 40)');
    expect(document.body.style.backgroundColor).toBe('rgb(4, 29, 40)');
    expect(tema()?.content).toBe('#041d28');

    unmount();

    // Al salir, el resto de la app vuelve a su fondo.
    expect(document.documentElement.style.backgroundColor).toBe('');
    expect(document.body.style.backgroundColor).toBe('');
    expect(tema()).toBeNull();
  });
});
