import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, onLegalNotAccepted } from './apiFetch';

const json = (status: number) => new Response(status === 200 ? '{"ok":true}' : null, { status });

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

describe('apiFetch · 403 LEGAL_NOT_ACCEPTED (ENG-140)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const legal403 = () =>
    new Response(JSON.stringify({ code: 'LEGAL_NOT_ACCEPTED', message: 'Tenés que aceptar…' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });

  it('avisa al handler y le deja la respuesta entera al llamador', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(legal403());
    const handler = vi.fn();
    const off = onLegalNotAccepted(handler);

    const res = await apiFetch('/appointments/me');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'LEGAL_NOT_ACCEPTED' });
    off();
  });

  it('un 403 por otro motivo no lo dispara', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'No es tu turno' }), { status: 403 }),
    );
    const handler = vi.fn();
    const off = onLegalNotAccepted(handler);

    await apiFetch('/appointments/x');

    expect(handler).not.toHaveBeenCalled();
    off();
  });
});
