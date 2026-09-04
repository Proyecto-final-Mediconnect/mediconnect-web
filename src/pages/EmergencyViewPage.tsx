import { Link } from 'react-router-dom';
import {
  MEDIPASS_PREFIJO,
  MOCK_VITAL_BLOCK,
} from '../features/medipass/lib/mockMediPass';
import { DashboardLayout } from './DashboardLayout';

/**
 * Vista de emergencia del MediPass (pantalla "qr" del canvas).
 *
 * Es lo que ve alguien que escanea el código **sin autorización expresa**: el
 * bloque vital y nada más. Acá se muestra como una previsualización para el
 * paciente —el canvas la ofrece con "ver cómo lo lee un médico en el exterior"—;
 * el acceso real de un consultante externo es ENG-73 y ENG-118, y entra sin
 * sesión con el código.
 *
 * **Está en inglés a propósito, y eso es del canvas.** El caso de uso es una
 * guardia en el exterior: quien la lee puede no hablar español, y una alergia mal
 * entendida es el peor error posible de esta pantalla. Los códigos van en CIE-10
 * por lo mismo — un diagnóstico escrito en otro idioma sigue siendo legible por
 * su código.
 *
 * ⚠️ Nada de esto sale de la API: no hay MediPass en el backend, y el perfil de
 * paciente ni siquiera tiene grupo sanguíneo, alergias o contacto de emergencia.
 */
export function EmergencyViewPage() {
  const v = MOCK_VITAL_BLOCK;

  return (
    <DashboardLayout barTitle="Vista de emergencia">
      <div className="grid gap-5">
        <p className="rounded-[14px] border border-dashed border-line-strong bg-surface px-5 py-4 text-[13px] leading-[1.7] text-muted">
          <strong className="font-bold text-brand-deep">
            Así se ve tu MediPass en una emergencia.
          </strong>{' '}
          Es una previsualización con datos de ejemplo: quien escanee tu código sin tu
          autorización solo va a ver este bloque. Está en inglés porque el caso es una
          guardia en el exterior.
        </p>

        <article className="mx-auto w-full max-w-[560px] overflow-hidden rounded-[14px] border border-night bg-night text-white">
          <header className="border-b border-white/10 px-7 py-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[15px] font-bold text-white">MediPass</p>
              <p className="rounded-full bg-danger/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-danger">
                Emergency access · read only
              </p>
            </div>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-bright">
              Critical information
            </p>
            <h2 className="font-display mt-2 text-[30px] leading-[1.1] text-white">{v.nombre}</h2>
            <p className="mt-2 text-[13px] text-on-night">
              {v.sexo} · {v.edad} y · Blood type {v.grupoSanguineo} · {v.pais}
            </p>
            <p className="mt-1 font-mono text-[12px] text-on-night-soft">
              {MEDIPASS_PREFIJO}-····-····
            </p>
          </header>

          <div className="grid gap-6 px-7 py-6">
            {/* Las alergias van primero y en rojo: es el dato que cambia lo que
                el médico indica en los primeros segundos. */}
            <Bloque titulo="Allergies" destacado>
              {v.alergias.map((a) => (
                <p key={a.que} className="text-[15px] font-bold text-danger">
                  {a.que} — {a.gravedad}
                </p>
              ))}
            </Bloque>

            <Bloque titulo="Active medication">
              {v.medicacion.map((m) => (
                <p key={m.droga} className="text-[15px] font-semibold text-white">
                  {m.droga} <span className="font-medium text-on-night">{m.dosis}</span>
                  {m.nota && (
                    <span className="ml-2 rounded-full bg-danger/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-danger">
                      {m.nota}
                    </span>
                  )}
                </p>
              ))}
            </Bloque>

            <Bloque titulo="Conditions">
              {v.condiciones.map((c) => (
                <p key={c.codigo} className="text-[15px] font-semibold text-white">
                  {c.nombre}{' '}
                  <span className="font-mono text-[12px] text-on-night-soft">{c.codigo}</span>
                </p>
              ))}
            </Bloque>

            <Bloque titulo="Emergency contact">
              <p className="text-[15px] font-semibold text-white">
                {v.contacto.nombre} · {v.contacto.vinculo}
              </p>
              <a
                href={`tel:${v.contacto.telefono.replace(/\s/g, '')}`}
                className="text-[15px] font-bold text-brand-bright underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright"
              >
                {v.contacto.telefono}
              </a>
            </Bloque>
          </div>

          <p className="border-t border-white/10 px-7 py-4 text-[12px] leading-[1.6] text-on-night-soft">
            This access is logged and limited to the vital block. Full clinical notes require
            the patient&rsquo;s explicit authorization.
          </p>
        </article>

        {/* El pie de arriba dice "is logged" porque es lo que va a decirle al
            médico. El registro de accesos es ENG-76 y ENG-87, y no existe: se
            aclara acá, del lado del paciente, no adentro de la tarjeta. */}
        <p className="mx-auto max-w-[560px] text-center text-[12px] leading-[1.6] text-muted-soft">
          El registro de accesos todavía no existe: es ENG-76 y ENG-87. Hasta que esté, ese
          aviso describe lo que va a pasar, no lo que pasa.
        </p>

        <Link
          to="/medipass"
          className="mx-auto text-[13px] font-semibold text-brand-hover underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          ← Volver a mi MediPass
        </Link>
      </div>
    </DashboardLayout>
  );
}

function Bloque({
  titulo,
  destacado = false,
  children,
}: {
  titulo: string;
  destacado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3
        className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
          destacado ? 'text-danger' : 'text-on-night-soft'
        }`}
      >
        {titulo}
      </h3>
      <div className="mt-2 grid gap-1.5">{children}</div>
    </section>
  );
}
