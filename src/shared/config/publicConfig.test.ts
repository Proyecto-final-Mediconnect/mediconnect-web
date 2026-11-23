import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPublicConfig } from './publicConfig';
import { TEST_PUBLIC_CONFIG } from './testPublicConfig';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** ENG-229 — las reglas de negocio se leen de `GET /config`. */
describe('getPublicConfig', () => {
  afterEach(() => vi.restoreAllMocks());

  it('pide /config y devuelve lo que informa el backend', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(TEST_PUBLIC_CONFIG));

    await expect(getPublicConfig()).resolves.toEqual(TEST_PUBLIC_CONFIG);
    expect(String(spy.mock.calls[0][0])).toMatch(/\/config$/);
  });

  it('si falla, tira un error con el mensaje del backend', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ message: 'caído' }, 503));

    await expect(getPublicConfig()).rejects.toMatchObject({ status: 503, message: 'caído' });
  });
});
