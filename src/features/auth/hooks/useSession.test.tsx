// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { SESSION_QUERY_KEY, useLogout } from './useSession';

describe('useLogout', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // En un equipo compartido, el próximo que ingrese no puede ver ni por un
  // instante el código MediPass, las alergias o los turnos del anterior.
  it('borra de la caché los datos del usuario, no solo los invalida', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    const client = new QueryClient();
    client.setQueryData(SESSION_QUERY_KEY, { id: 'u1' });
    client.setQueryData(['medipass', 'me'], { codigo: 'AB12CD34' });
    client.setQueryData(['medipass', 'me', 'vital'], { alergias: ['Penicilina'] });
    client.setQueryData(['appointments', 'me'], [{ id: 't1' }]);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useLogout(), { wrapper });
    await act(() => result.current.mutateAsync());

    expect(client.getQueryData(SESSION_QUERY_KEY)).toBeNull();
    expect(client.getQueryData(['medipass', 'me'])).toBeUndefined();
    expect(client.getQueryData(['medipass', 'me', 'vital'])).toBeUndefined();
    expect(client.getQueryData(['appointments', 'me'])).toBeUndefined();
  });
});
