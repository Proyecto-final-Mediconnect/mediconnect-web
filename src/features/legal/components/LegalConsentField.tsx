import { Link } from 'react-router-dom';

/**
 * Casilla de aceptación de los textos legales (ENG-140).
 *
 * **Arranca sin marcar** y no hay forma de marcarla por defecto: el
 * consentimiento para tratar datos de salud tiene que ser expreso (Ley 25.326,
 * art. 7). Los enlaces abren `/legales` en otra pestaña para no perder lo que ya
 * se escribió en el formulario.
 */
export function LegalConsentField({
  checked,
  onChange,
  error,
  id = 'acceptedLegal',
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  id?: string;
}) {
  const errorId = `${id}-error`;

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="flex items-start gap-3 text-[13px] leading-[1.6] text-ink">
        <input
          id={id}
          name={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-[3px] h-4 w-4 shrink-0 accent-brand-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        />
        <span>
          Leí y acepto los <Enlace to="/legales#terminos">términos y condiciones</Enlace>, la{' '}
          <Enlace to="/legales#privacidad">política de privacidad</Enlace> y doy mi{' '}
          <Enlace to="/legales#consentimiento">
            consentimiento para el tratamiento de mis datos de salud
          </Enlace>
          .
        </span>
      </label>
      {error && (
        <p id={errorId} role="alert" className="pl-7 text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Enlace({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      target="_blank"
      rel="noopener"
      className="font-semibold text-brand-hover underline underline-offset-2 hover:text-brand-deep"
    >
      {children}
    </Link>
  );
}
