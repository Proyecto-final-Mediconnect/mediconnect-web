/**
 * Compresión de la foto de perfil en el navegador (ENG-48): redimensiona a un
 * máximo de 512px de lado y re-encodea a WEBP con calidad 0.82. Así la foto que
 * llega al backend ya pesa poco (el server igual valida tipo y tamaño). Si algo
 * falla (formato no decodificable, sin canvas), devuelve el archivo original.
 */
const MAX_DIMENSION = 512;
const OUTPUT_TYPE = 'image/webp';
const QUALITY = 0.82;

export async function compressImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, OUTPUT_TYPE, QUALITY),
  );
  if (!blob) return file;

  return new File([blob], 'avatar.webp', { type: OUTPUT_TYPE });
}
