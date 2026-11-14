import type { ReactNode } from 'react';
import type { VitalBlock } from '../types/medipass';

/**
 * El bloque vital, como lo lee un médico de guardia.
 *
 * Todo en español para la demo. El multilenguaje (inglés para guardias en el
 * exterior) queda como trabajo futuro; los diagnósticos van con su código CIE-10,
 * legible en cualquier idioma.
 */
export function VitalBlockCard({
  vital,
  footer,
  fill = false,
}: {
  vital: VitalBlock;
  footer?: ReactNode;
  /** Ocupa todo el ancho de su columna en vez de centrarse con un tope. */
  fill?: boolean;
}) {
  const alergias = vital.alergias ?? [];
  const medicacion = vital.medicacion ?? [];
  const condiciones = vital.condiciones ?? [];
  // Un bloque que el paciente eligió no mostrar (ENG-149) **no viene** en la
  // respuesta. Se dice "no compartido" y no "ninguna": un médico que lee "Sin
  // alergias conocidas" puede indicar justo lo que no debe.
  const oculto = (clave: keyof VitalBlock) => !(clave in vital);
  const datos = [
    vital.sexo,
    typeof vital.edad === 'number' ? `${vital.edad} años` : null,
    oculto('grupoSanguineo')
      ? 'Grupo sanguíneo no compartido'
      : vital.grupoSanguineo
        ? `Grupo sanguíneo ${vital.grupoSanguineo}`
        : 'Grupo sanguíneo sin registrar',
    vital.pais,
  ].filter(Boolean);

  return (
    <article
      className={`${fill ? 'w-full' : 'mx-auto w-full max-w-[560px]'} overflow-hidden rounded-[14px] border border-night bg-night text-white`}
    >
      <header className="border-b border-white/10 px-6 py-6 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] font-bold text-white">MediPass</p>
          <p className="rounded-full bg-danger/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-danger">
            Acceso de emergencia · solo lectura
          </p>
        </div>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-bright">
          Información crítica
        </p>
        <h2 className="font-display mt-2 text-[30px] leading-[1.1] text-white">{vital.nombre}</h2>
        <p className="mt-2 text-[13px] text-on-night">{datos.join(' · ')}</p>
      </header>

      <div className="grid gap-6 px-6 py-6 sm:px-7">
        {/* Las alergias van primero y en rojo: es el dato que cambia lo que el
            médico indica en los primeros segundos. */}
        <Bloque titulo="Alergias" destacado>
          {oculto('alergias') ? (
            <NoCompartido />
          ) : alergias.length === 0 ? (
            <p className="text-[15px] font-semibold text-white">Sin alergias conocidas</p>
          ) : (
            alergias.map((a) => (
              <p key={a.que} className="text-[15px] font-bold text-danger">
                {a.que} — {a.gravedad}
              </p>
            ))
          )}
        </Bloque>

        <Bloque titulo="Medicación activa">
          {oculto('medicacion') ? (
            <NoCompartido />
          ) : medicacion.length === 0 ? (
            <p className="text-[15px] font-semibold text-white">Ninguna</p>
          ) : (
            medicacion.map((m) => (
              <p key={m.droga} className="text-[15px] font-semibold text-white">
                {m.droga} <span className="font-medium text-on-night">{m.dosis}</span>
                {m.nota && (
                  <span className="ml-2 rounded-full bg-danger/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-danger">
                    {m.nota}
                  </span>
                )}
              </p>
            ))
          )}
        </Bloque>

        <Bloque titulo="Condiciones">
          {oculto('condiciones') ? (
            <NoCompartido />
          ) : condiciones.length === 0 ? (
            <p className="text-[15px] font-semibold text-white">Sin condiciones informadas</p>
          ) : (
            condiciones.map((c) => (
              <p key={c.codigo} className="text-[15px] font-semibold text-white">
                {c.nombre}{' '}
                <span className="font-mono text-[12px] text-on-night-soft">{c.codigo}</span>
              </p>
            ))
          )}
        </Bloque>

        <Bloque titulo="Contacto de emergencia">
          {oculto('contacto') ? (
            <NoCompartido />
          ) : vital.contacto ? (
            <>
              <p className="text-[15px] font-semibold text-white">
                {vital.contacto.nombre} · {vital.contacto.vinculo}
              </p>
              <a
                href={`tel:${vital.contacto.telefono.replace(/\s/g, '')}`}
                className="text-[15px] font-bold text-brand-bright underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright"
              >
                {vital.contacto.telefono}
              </a>
            </>
          ) : (
            <p className="text-[15px] font-semibold text-white">Sin registrar</p>
          )}
        </Bloque>
      </div>

      {footer ?? (
        <p className="border-t border-white/10 px-6 py-4 text-[12px] leading-[1.6] text-on-night-soft sm:px-7">
          Este acceso queda registrado y se limita al bloque vital. Las notas clínicas completas
          requieren la autorización explícita del paciente.
        </p>
      )}
    </article>
  );
}

function Bloque({
  titulo,
  destacado = false,
  children,
}: {
  titulo: string;
  destacado?: boolean;
  children: ReactNode;
}) {
  return (
    <section>
      <h3
        className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
          destacado ? 'text-danger' : 'text-on-night-soft'
        }`}
      >
        {titulo}
      </h3>
      <div className="mt-2 grid gap-1.5">{children}</div>
    </section>
  );
}

/** Un bloque que el paciente eligió no mostrar (ENG-149). */
function NoCompartido() {
  return (
    <p className="text-[14px] font-medium italic text-on-night-soft">
      No compartido por el paciente
    </p>
  );
}
