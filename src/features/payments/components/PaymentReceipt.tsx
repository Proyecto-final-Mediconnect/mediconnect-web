import { useState } from 'react';
import { cuando } from '../../appointments/lib/timeline';
import { formatPrice } from '../../appointments/lib/weeks';
import { paymentMethodLabel } from '../lib/receipt';
import type { PaymentReceipt as Receipt } from '../types/payment';

/**
 * El comprobante del pago (ENG-199): importe, medio, cuándo se acreditó y el
 * número de operación de MercadoPago, que se puede copiar para un reclamo.
 *
 * Lo usan la confirmación de la reserva y el detalle del turno.
 */
export function PaymentReceipt({
  receipt,
  confirmedAt,
  titulo = 'Comprobante',
}: {
  receipt: Receipt;
  confirmedAt: string | null | undefined;
  titulo?: string;
}) {
  const fecha = cuando(confirmedAt);

  return (
    <section
      aria-labelledby="comprobante"
      className="overflow-hidden rounded-[14px] border border-line bg-white"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line-soft px-[22px] py-[18px]">
        <h2
          id="comprobante"
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
        >
          {titulo}
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-teal px-2.5 py-1 text-xs font-semibold text-brand-hover">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand" />
          Acreditado
        </span>
      </header>
      <dl className="grid gap-[11px] px-[22px] py-[18px] text-sm font-medium text-ink">
        <Fila titulo="Importe">
          <span className="font-bold text-brand-deep">
            {formatPrice(receipt.amount, receipt.currency)}
          </span>
        </Fila>
        <Fila titulo="Medio">{paymentMethodLabel(receipt.method)}</Fila>
        {fecha && <Fila titulo="Fecha">{fecha}</Fila>}
        {receipt.operationId && (
          <Fila titulo="Operación">
            <NumeroDeOperacion numero={receipt.operationId} />
          </Fila>
        )}
      </dl>
    </section>
  );
}

function NumeroDeOperacion({ numero }: { numero: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(numero);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles el número igual queda a la vista.
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="tabular-nums">N.º {numero}</span>
      <button
        type="button"
        onClick={() => void copiar()}
        aria-label={`Copiar el número de operación ${numero}`}
        className="rounded-[6px] border border-line px-2 py-0.5 text-[11px] font-semibold text-brand-hover transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {copiado ? 'Copiado' : 'Copiar'}
      </button>
    </span>
  );
}

function Fila({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{titulo}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
