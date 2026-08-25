import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPublicProfile } from './getPublicProfile';
import { ApiError } from '../../../shared/lib/httpClient';
import type { PublicProfessionalProfile } from '../types/catalog';

const ID = '11111111-1111-4111-8111-111111111111';

const PROFILE: PublicProfessionalProfile = {
  id: ID,
  firstName: 'Ana',
  lastName: 'Álvarez',
  photoUrl: null,
  bio: 'Cardióloga con 10 años de experiencia.',
  specialties: [{ id: 'spec-1', name: 'Cardiología' }],
  education: [{ id: 'edu-1', institution: 'UNC', degree: 'Medicina', year: 2014 }],
  price: 12000,
  currency: 'ARS',
};

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

afterEach(() => vi.restoreAllMocks());

describe('getPublicProfile', () => {
  it('pide el perfil por id y devuelve el contrato completo', async () => {
    const fetchSpy = mockFetch(200, PROFILE);

    await expect(getPublicProfile(ID)).resolves.toEqual(PROFILE);

    expect(String(fetchSpy.mock.calls[0][0])).toContain(`/professionals/${ID}`);
  });

  it('manda las cookies de sesión aunque la ruta sea pública', async () => {
    // El endpoint no pide auth, pero el cliente compartido manda
    // `credentials: 'include'` siempre. Si alguien lo cambiara, un paciente
    // logueado dejaría de verse como tal en el resto de la app.
    const fetchSpy = mockFetch(200, PROFILE);

    await getPublicProfile(ID);

    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
  });

  it('propaga el 404 como ApiError para poder distinguirlo del resto', async () => {
    mockFetch(404, { message: 'Profesional no encontrado' });

    await expect(getPublicProfile(ID)).rejects.toMatchObject({
      status: 404,
      message: 'Profesional no encontrado',
    });
    await expect(getPublicProfile(ID)).rejects.toBeInstanceOf(ApiError);
  });

  it('usa un mensaje propio cuando el backend no manda ninguno', async () => {
    mockFetch(500, {});

    await expect(getPublicProfile(ID)).rejects.toMatchObject({
      message: 'No pudimos cargar el perfil. Intentá de nuevo.',
    });
  });
});
