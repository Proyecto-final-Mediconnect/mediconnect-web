import type { ReactNode } from 'react';
import type { VitalBlock } from '../types/medipass';

/**
 * El bloque vital, como lo lee un médico de guardia.
 *
 * **Está en inglés a propósito, y eso es del canvas.** El caso de uso es una
 * guardia en el exterior: quien la lee puede no hablar español, y una alergia mal
 * entendida es el peor error posible de esta pantalla. Los códigos van en CIE-10
 * por lo mismo — un diagnóstico escrito en otro idioma sigue siendo legible por
 * su código.
 */
export function VitalBlockCard({ vital, footer }: { vital: VitalBlock; footer?: ReactNode }) {
  const alergias = vital.alergias ?? [];
  const medicacion = vital.medicacion ?? [];
  const condiciones = vital.condiciones ?? [];
  const datos = [
    vital.sexo,
    typeof vital.edad === 'number' ? `${vital.edad} y` : null,
    vital.grupoSanguineo ? `Blood type ${vital.grupoSanguineo}` : 'Blood type not recorded',
    vital.pais,
  ].filter(Boolean);

  return (
    <article className="mx-auto w-full max-w-[560px] overflow-hidden rounded-[14px] border border-night bg-night text-white">
      <header className="border-b border-white/10 px-6 py-6 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] font-bold text-white">MediPass</p>
          <p className="rounded-full bg-danger/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-danger">
            Emergency access · read only
          </p>
        </div>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-bright">
          Critical information
        </p>
        <h2 className="font-display mt-2 text-[30px] leading-[1.1] text-white">{vital.nombre}</h2>
        <p className="mt-2 text-[13px] text-on-night">{datos.join(' · ')}</p>
      </header>

      <div className="grid gap-6 px-6 py-6 sm:px-7">
        {/* Las alergias van primero y en rojo: es el dato que cambia lo que el
            médico indica en los primeros segundos. */}
        <Bloque titulo="Allergies" destacado>
          {alergias.length === 0 ? (
            <p className="text-[15px] font-semibold text-white">No known allergies</p>
          ) : (
            alergias.map((a) => (
              <p key={a.que} className="text-[15px] font-bold text-danger">
                {a.que} — {a.gravedad}
              </p>
            ))
          )}
        </Bloque>

        <Bloque titulo="Active medication">
          {medicacion.length === 0 ? (
            <p className="text-[15px] font-semibold text-white">None</p>
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

        <Bloque titulo="Conditions">
          {condiciones.length === 0 ? (
            <p className="text-[15px] font-semibold text-white">None reported</p>
          ) : (
            condiciones.map((c) => (
              <p key={c.codigo} className="text-[15px] font-semibold text-white">
                {c.nombre}{' '}
                <span className="font-mono text-[12px] text-on-night-soft">{c.codigo}</span>
              </p>
            ))
          )}
        </Bloque>

        <Bloque titulo="Emergency contact">
          {vital.contacto ? (
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
            <p className="text-[15px] font-semibold text-white">Not recorded</p>
          )}
        </Bloque>
      </div>

      {footer ?? (
        <p className="border-t border-white/10 px-6 py-4 text-[12px] leading-[1.6] text-on-night-soft sm:px-7">
          This access is logged and limited to the vital block. Full clinical notes require the
          patient&rsquo;s explicit authorization.
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
