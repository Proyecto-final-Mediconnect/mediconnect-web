// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePageTitle } from './usePageTitle';

describe('usePageTitle', () => {
  it('pone "<Pantalla> · MediConnect" y restaura el título al desmontar', () => {
    document.title = 'MediConnect';

    const { unmount } = renderHook(() => usePageTitle('Mis turnos'));
    expect(document.title).toBe('Mis turnos · MediConnect');

    unmount();
    expect(document.title).toBe('MediConnect');
  });
});
