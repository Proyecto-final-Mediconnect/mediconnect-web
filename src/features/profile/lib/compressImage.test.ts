// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compressImage } from './compressImage';

/** Canvas falso: `toBlob` devuelve el tipo que se le indique, ignorando el pedido
 *  (es lo que hace un browser sin soporte WEBP: encodea PNG en silencio). */
function stubCanvas(producedType: string | null) {
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: vi.fn() }),
    toBlob: (cb: (b: Blob | null) => void) =>
      cb(producedType ? new Blob(['x'], { type: producedType }) : null),
  };
  vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLElement);
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn().mockResolvedValue({ width: 1024, height: 768, close: vi.fn() }),
  );
}

const original = new File(['original'], 'foto.png', { type: 'image/png' });

describe('compressImage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('devuelve WEBP cuando el browser lo soporta', async () => {
    stubCanvas('image/webp');

    const result = await compressImage(original);

    expect(result.type).toBe('image/webp');
    expect(result.name).toBe('avatar.webp');
  });

  it('respeta el MIME real del blob si el browser no encodea WEBP', async () => {
    // Declararlo image/webp con contenido PNG rompe la validación por MIME del
    // backend, que es la que decide si acepta la foto.
    stubCanvas('image/png');

    const result = await compressImage(original);

    expect(result.type).toBe('image/png');
    expect(result.name).toBe('avatar.png');
  });

  it('devuelve el archivo original si no se pudo generar el blob', async () => {
    stubCanvas(null);

    expect(await compressImage(original)).toBe(original);
  });

  it('devuelve el archivo original si la imagen no se puede decodificar', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockRejectedValue(new Error('formato no soportado')),
    );

    expect(await compressImage(original)).toBe(original);
  });
});
