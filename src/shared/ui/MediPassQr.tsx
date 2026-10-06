import { QRCodeSVG } from 'qrcode.react';

type MediPassQrProps = {
  /**
   * Lo que codifica: la URL de la vista de emergencia con el código (ENG-135).
   * Sin valor —el QR ilustrativo de la landing— lleva a la vista de emergencia
   * sin código, donde se puede tipear uno.
   */
  value?: string;
  size?: number;
  className?: string;
};

/**
 * El QR del MediPass. Es un QR de verdad: lo lee la cámara de cualquier
 * celular y abre la vista de emergencia con el código cargado.
 *
 * Nivel de corrección `M`: aguanta un reflejo o una pantalla rayada sin volver
 * el código tan denso que cueste leerlo de lejos.
 */
export function MediPassQr({ value, size = 148, className = '' }: MediPassQrProps) {
  const contenido = value ?? `${window.location.origin}/medipass/emergencia`;
  return (
    <QRCodeSVG
      value={contenido}
      size={size}
      level="M"
      marginSize={0}
      fgColor="#0b4f6c"
      bgColor="#ffffff"
      className={className}
      role="img"
      aria-label="Código QR del MediPass"
      data-qr-value={contenido}
    />
  );
}
