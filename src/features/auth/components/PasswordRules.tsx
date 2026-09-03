/**
 * Los tres requisitos de la contraseña, a la vista mientras se escribe.
 *
 * El schema pide 8 caracteres, una mayúscula y un número, pero el formulario solo
 * anunciaba "Mínimo 8 caracteres" en el placeholder. Los otros dos aparecían
 * recién al enviar, y **de a uno**: zod reporta el primer problema de cada campo,
 * así que alguien con `contraseña` se comía tres viajes de ida y vuelta para
 * enterarse de las tres reglas.
 *
 * Se muestran siempre y se van tildando en vivo. En vacío van en gris —no en
 * rojo— porque todavía no hay error: nadie escribió nada.
 */

type PasswordRulesProps = {
  value: string;
};

const REGLAS = [
  { texto: 'Al menos 8 caracteres', cumple: (v: string) => v.length >= 8 },
  { texto: 'Una mayúscula', cumple: (v: string) => /[A-Z]/.test(v) },
  { texto: 'Un número', cumple: (v: string) => /[0-9]/.test(v) },
];

export function PasswordRules({ value }: PasswordRulesProps) {
  return (
    <ul
      // `aria-live` no: con tres reglas tildándose por tecla, un lector de
      // pantalla estaría interrumpiendo todo el tiempo. La lista se lee cuando la
      // persona la busca, y el error del envío sí se anuncia.
      className="grid gap-1.5"
    >
      {REGLAS.map((regla) => {
        const ok = regla.cumple(value);

        return (
          <li
            key={regla.texto}
            className={`flex items-center gap-2 text-[12px] ${
              ok ? 'font-semibold text-brand-hover' : 'text-muted'
            }`}
          >
            {/* El tilde y la marca vacía distinguen el estado sin depender del
                color, que es lo único que cambia entre las dos. */}
            <span aria-hidden="true" className="w-3 flex-none text-center">
              {ok ? '✓' : '·'}
            </span>
            {regla.texto}
            <span className="sr-only">{ok ? ' (cumplido)' : ' (falta)'}</span>
          </li>
        );
      })}
    </ul>
  );
}
