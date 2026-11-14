import { afterEach, describe, expect, it, vi } from 'vitest';
import { NETWORK_ERROR_MESSAGE } from '../api/apiFetch';
import { ApiError, apiRequest } from './httpClient';

describe('apiRequest', () => {
  afterEach(() => vi.restoreAllMocks());

  it('convierte el TypeError de fetch en un ApiError legible con status 0', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await apiRequest('/x').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: NETWORK_ERROR_MESSAGE, status: 0 });
  });

  it('no se traga los AbortError', async () => {
    const abort = new DOMException('cancelado', 'AbortError');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abort);

    await expect(apiRequest('/x')).rejects.toBe(abort);
  });

  it('un 500 mantiene el mensaje del backend', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Falló' }), { status: 500 }),
    );

    await expect(apiRequest('/x')).rejects.toMatchObject({ message: 'Falló', status: 500 });
  });
});
