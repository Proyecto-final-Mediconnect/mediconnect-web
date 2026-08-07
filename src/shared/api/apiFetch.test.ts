import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './apiFetch';

const json = (status: number) =>
  new Response(status === 200 ? '{"ok":true}' : null, { status });

function urlOf(call: unknown[]): string {
  return String(call[0]);
}

describe('apiFetch (ENG-44 · refresh token rotativo)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('devuelve la respuesta directo cuando no hay 401', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(200));

    const res = await apiFetch('/me');

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1); // sin refresh de por medio
  });

  it('ante 401 renueva la sesión y reintenta el request original', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(401)) // /me vencido
      .mockResolvedValueOnce(json(200)) // /auth/refresh
      .mockResolvedValueOnce(json(200)); // /me reintentado

    const res = await apiFetch('/me');

    expect(res.status).toBe(200);
    const llamadas = spy.mock.calls.map(urlOf);
    expect(llamadas[1]).toContain('/auth/refresh');
    expect(llamadas[2]).toContain('/me');
  });

  it('si la renovación falla, devuelve el 401 (usuario deslogueado)', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(401)) // /me vencido
      .mockResolvedValueOnce(json(401)); // refresh rechazado

    const res = await apiFetch('/me');

    expect(res.status).toBe(401);
    expect(spy).toHaveBeenCalledTimes(2); // no reintenta el original
  });

  it('manda las cookies de sesión en cada request', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(200));

    await apiFetch('/me');

    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe('include');
  });
});
