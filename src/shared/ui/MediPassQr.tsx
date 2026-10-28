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

/** Lado del logo respecto del QR. Con nivel `H` se puede tapar hasta ~30 %. */
const LOGO_RATIO = 0.22;

/**
 * El QR del MediPass. Es un QR de verdad: lo lee la cámara de cualquier
 * celular y abre la vista de emergencia con el código cargado.
 *
 * Lleva el corazón de MediConnect en el centro, en el azul del QR
 * (`qr-logo.png`; el de la marca es teal). El logo tapa
 * módulos, así que va con nivel de corrección `H` —el que más daño tolera— y
 * `excavate`, que despeja los módulos de abajo en vez de dibujar encima: el
 * lector los da por perdidos y los recupera con la redundancia.
 */
export function MediPassQr({ value, size = 148, className = '' }: MediPassQrProps) {
  const contenido = value ?? `${window.location.origin}/medipass/emergencia`;
  const logo = Math.round(size * LOGO_RATIO);
  return (
    <QRCodeSVG
      value={contenido}
      size={size}
      level="H"
      marginSize={0}
      imageSettings={{ src: '/qr-logo.png', height: logo, width: logo, excavate: true }}
      fgColor="#0b4f6c"
      bgColor="#ffffff"
      className={className}
      role="img"
      aria-label="Código QR del MediPass"
      data-qr-value={contenido}
    />
  );
}
