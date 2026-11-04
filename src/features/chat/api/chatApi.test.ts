import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendAttachment } from './chatApi';

describe('sendAttachment (ENG-102)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('manda multipart sin forzar Content-Type (lo arma el navegador con el boundary)', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"id":"m-1"}', { status: 201 }));
    const file = new File(['%PDF'], 'estudio.pdf', { type: 'application/pdf' });

    await sendAttachment('conv-1', file, 'hola');

    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeInstanceOf(FormData);
    const headers = new Headers(init.headers);
    expect(headers.has('Content-Type')).toBe(false);
  });
});
