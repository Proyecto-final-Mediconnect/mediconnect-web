import type { Specialty } from '../types/professionalProfile';

type ProfilePreviewProps = {
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  bio: string;
  specialties: Specialty[];
  consultationPrice: number | null;
  currency: string;
};

/**
 * `professionals.currency` es `CHAR(3) NOT NULL DEFAULT 'ARS'`, así que en la
 * práctica siempre llega un código válido. Pero `Intl.NumberFormat` tira `RangeError`
 * con cualquier código que no sea ISO 4217, y el fallback tiene que seguir siendo
 * legible: sin la guarda, un currency raro terminaba imprimiéndose crudo al lado del
 * número (ej. `"XX 15000"`).
 */
function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    const amountText = new Intl.NumberFormat('es-AR', {
      maximumFractionDigits: 0,
    }).format(amount);
    return /^[A-Za-z]{3}$/.test(currency)
      ? `${currency.toUpperCase()} ${amountText}`
      : `$ ${amountText}`;
  }
}

/** Tarjeta que muestra el perfil tal como lo verá un paciente en el catálogo. */
export function ProfilePreview({
  firstName,
  lastName,
  photoUrl,
  bio,
  specialties,
  consultationPrice,
  currency,
}: ProfilePreviewProps) {
  const fullName = `${firstName} ${lastName}`.trim() || 'Tu nombre';
  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '👤';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
        Vista previa
      </p>

      <div className="flex items-center gap-4">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`Foto de ${fullName}`}
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-teal text-xl font-semibold text-brand">
            {initials}
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-ink">{fullName}</h3>
          {consultationPrice !== null && (
            <p className="text-sm font-medium text-brand">
              {formatPrice(consultationPrice, currency)}
              <span className="text-muted"> · por consulta</span>
            </p>
          )}
        </div>
      </div>

      {specialties.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {specialties.map((s) => (
            <span
              key={s.id}
              className="rounded-full bg-surface-teal px-3 py-1 text-xs font-medium text-brand-deep"
            >
              {s.name}
            </span>
          ))}
        </div>
      )}

      <p className="mt-4 whitespace-pre-line text-sm text-muted">
        {bio.trim() || 'Todavía no escribiste tu biografía.'}
      </p>
    </div>
  );
}
