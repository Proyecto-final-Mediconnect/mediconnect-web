import { describe, expect, it } from 'vitest';
import { shouldRetryPublicProfile } from './usePublicProfile';
import { ApiError } from '../../../shared/lib/httpClient';

describe('shouldRetryPublicProfile', () => {
  it('no reintenta ante un 404: la respuesta no va a cambiar', () => {
    expect(shouldRetryPublicProfile(0, new ApiError(404, 'No encontrado'))).toBe(false);
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
