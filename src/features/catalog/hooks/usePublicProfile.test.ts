import { describe, expect, it } from 'vitest';
import { isMissingProfileError, shouldRetryPublicProfile } from './usePublicProfile';
import { ApiError } from '../../../shared/lib/httpClient';

describe('shouldRetryPublicProfile', () => {
  it('no reintenta ante un 404: la respuesta no va a cambiar', () => {
    expect(shouldRetryPublicProfile(0, new ApiError(404, 'No encontrado'))).toBe(false);
  });

  it('no reintenta ante un 400: el id no es un UUID y seguirá sin serlo', () => {
    expect(shouldRetryPublicProfile(0, new ApiError(400, 'Validation failed'))).toBe(false);
  });

  it('no reintenta ante un 429: la ventana del rate limit es de 60s y el backoff no llega', () => {
    expect(shouldRetryPublicProfile(0, new ApiError(429, 'Too many requests'))).toBe(false);
  });

  it('reintenta ante un error del servidor', () => {
    expect(shouldRetryPublicProfile(0, new ApiError(500, 'Boom'))).toBe(true);
  });

  it('reintenta ante un error de red, que no es ApiError', () => {
    expect(shouldRetryPublicProfile(0, new TypeError('Failed to fetch'))).toBe(true);
  });

  it('corta después de 3 intentos para no reintentar para siempre', () => {
    expect(shouldRetryPublicProfile(2, new ApiError(500, 'Boom'))).toBe(true);
    expect(shouldRetryPublicProfile(3, new ApiError(500, 'Boom'))).toBe(false);
  });
});

describe('isMissingProfileError', () => {
  it('trata el 404 como perfil inexistente', () => {
    expect(isMissingProfileError(new ApiError(404, 'No encontrado'))).toBe(true);
  });

  it('trata el 400 como perfil inexistente: para el usuario es el mismo caso', () => {
    expect(isMissingProfileError(new ApiError(400, 'Validation failed'))).toBe(true);
  });

  it('NO trata el 429 como inexistente: decir que no existe sería mentira', () => {
    expect(isMissingProfileError(new ApiError(429, 'Too many requests'))).toBe(false);
  });

  it('no confunde un error del servidor con un perfil que no existe', () => {
    expect(isMissingProfileError(new ApiError(500, 'Boom'))).toBe(false);
  });

  it('un error de red no es un perfil inexistente', () => {
    expect(isMissingProfileError(new TypeError('Failed to fetch'))).toBe(false);
  });

  it('sin error no hay nada que reportar', () => {
    expect(isMissingProfileError(null)).toBe(false);
  });
});
