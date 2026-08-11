import { describe, expect, it } from 'vitest';
import type { Breadcrumb, ErrorEvent } from '@sentry/react';
import { scrubBreadcrumb, scrubEvent } from './sentry.scrubbing';

/** `ErrorEvent` se distingue del resto de los eventos por tener
 *  `type: undefined`; el helper evita repetirlo en cada caso. */
function buildEvent(partial: Partial<ErrorEvent>): ErrorEvent {
  return { type: undefined, ...partial };
}

describe('scrubEvent', () => {
  it('elimina el query string de la url y conserva la ruta', () => {
    const event = buildEvent({
      request: { url: 'https://mediconnect.ar/medipass?code=123456' },
    });

    const result = scrubEvent(event);

    expect(result.request?.url).toBe('https://mediconnect.ar/medipass');
  });

  it('elimina los headers, que pueden traer el Referer con ids', () => {
    const event = buildEvent({
      request: {
        url: 'https://mediconnect.ar/paciente',
        headers: {
          Referer: 'https://mediconnect.ar/pacientes/42/historia',
          'User-Agent': 'Mozilla/5.0',
        },
      },
    });

    const result = scrubEvent(event);

    expect(result.request?.headers).toBeUndefined();
  });

  it('identifica al usuario por su id y descarta email, nombre e IP', () => {
    const event = buildEvent({
      user: {
        id: '3f1c0b6e-9b1a-4f7d-8c2e-5a6b7c8d9e0f',
        email: 'paciente@example.com',
        username: 'paciente',
        ip_address: '181.44.12.7',
      },
    });

    const result = scrubEvent(event);

    expect(result.user).toEqual({ id: '3f1c0b6e-9b1a-4f7d-8c2e-5a6b7c8d9e0f' });
  });

  it('no falla si el evento no trae request ni user', () => {
    const event = buildEvent({ message: 'boom' });

    expect(() => scrubEvent(event)).not.toThrow();
  });
});

describe('scrubBreadcrumb', () => {
  it('descarta la url del breadcrumb de red, que puede llevar ids', () => {
    const breadcrumb: Breadcrumb = {
      type: 'http',
      category: 'fetch',
      data: {
        url: 'https://api.mediconnect.ar/pacientes/42/historia?code=123',
        method: 'GET',
        status_code: 500,
      },
    };

    const result = scrubBreadcrumb(breadcrumb);

    expect(result.data).toEqual({ method: 'GET', status_code: 500 });
  });

  it('conserva método y estado para poder reconstruir qué falló', () => {
    const breadcrumb: Breadcrumb = {
      category: 'fetch',
      data: { method: 'POST', status_code: 401 },
    };

    const result = scrubBreadcrumb(breadcrumb);

    expect(result.data).toEqual({ method: 'POST', status_code: 401 });
  });

  it('descarta cualquier otro payload, como un body con contraseña', () => {
    const breadcrumb: Breadcrumb = {
      category: 'fetch',
      data: { body: { password: 'secreto' }, method: 'POST' },
    };

    const result = scrubBreadcrumb(breadcrumb);

    expect(result.data).toEqual({ method: 'POST' });
  });

  it('no toca los breadcrumbs sin data', () => {
    const breadcrumb: Breadcrumb = { category: 'navigation', level: 'info' };

    const result = scrubBreadcrumb(breadcrumb);

    expect(result).toEqual({ category: 'navigation', level: 'info' });
  });
});
