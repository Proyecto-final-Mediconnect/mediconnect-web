import { Link } from 'react-router-dom';
import { useMyScope, useUpdateScope } from '../hooks/useMediPass';
import type { MediPassScope, VitalBlock } from '../types/medipass';

/** Los bloques que se pueden apagar, en el orden en que los lee un médico. */
const BLOQUES: { clave: keyof MediPassScope; titulo: string; detalle: string }[] = [
  { clave: 'alergias', titulo: 'Alergias', detalle: 'A remedios, alimentos u otras' },
  { clave: 'medicacion', titulo: 'Medicación', detalle: 'Lo que tomás de forma crónica' },
  { clave: 'condiciones', titulo: 'Condiciones', detalle: 'Diagnósticos que tiene que saber' },
  {
    clave: 'grupoSanguineo',
    titulo: 'Grupo sanguíneo',
    detalle: 'Por si hace falta una transfusión',
  },
  { clave: 'contacto', titulo: 'Contacto de emergencia', detalle: 'A quién llamar' },
];

/** Si el bloque tiene algo cargado: apagar uno vacío no cambia nada. */
function cargado(vital: VitalBlock | undefined, clave: keyof MediPassScope): boolean {
  if (!vital) return true;
  switch (clave) {
    case 'alergias':
      return !!vital.alergias?.length;
    case 'medicacion':
      return !!vital.medicacion?.length;
    case 'condiciones':
      return !!vital.condiciones?.length;
    case 'grupoSanguineo':
      return !!vital.grupoSanguineo;
    case 'contacto':
      return !!vital.contacto;
  }
}

/**
 * Qué ve un consultante externo (ENG-149): un interruptor por bloque. El nombre
 * y la edad siempre se ven, porque sin ellos el médico no sabe de quién es la
 * ficha. El cambio se ve al instante y llega también a los accesos ya abiertos.
 */
export function ScopeSettings({ vital }: { vital?: VitalBlock }) {
  const scope = useMyScope();
  const guardar = useUpdateScope();

  return (
    <section
      aria-labelledby="que-se-muestra"
      className="overflow-hidden rounded-[14px] border border-line bg-white"
    >
      <header className="border-b border-line-soft px-5 py-4">
        <h3 id="que-se-muestra" className="text-[15px] font-bold text-brand-deep">
          Qué se muestra
        </h3>
        <p className="mt-0.5 text-[13px] leading-[1.6] text-muted">
          Tu nombre y tu edad siempre se ven. Lo demás lo elegís vos, y vale también para quien ya
          está mirando.
        </p>
      </header>

      {scope.isPending ? (
        <p role="status" className="px-5 py-4 text-[13px] text-muted">
          Cargando…
        </p>
      ) : scope.isError ? (
        <p role="alert" className="px-5 py-4 text-[13px] text-danger">
          {scope.error.message}
        </p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {BLOQUES.map(({ clave, titulo, detalle }) => {
            const encendido = scope.data[clave];
            const hayDatos = cargado(vital, clave);
            return (
              <li key={clave} className="flex items-center gap-4 px-5 py-3">
                <span className="min-w-0 flex-1">
                  <span
                    id={`scope-${clave}`}
                    className={`block text-[14px] font-semibold ${hayDatos ? 'text-brand-deep' : 'text-muted'}`}
                  >
                    {titulo}
                  </span>
                  <span className="block text-[12px] text-muted-soft">
                    {hayDatos ? (
                      detalle
                    ) : (
                      <>
                        Sin cargar ·{' '}
                        <Link
                          to="/perfil/paciente#emergencias"
                          className="font-semibold text-brand-hover underline-offset-2 hover:underline"
                        >
                          Completar
                        </Link>
                      </>
                    )}
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={encendido}
                  aria-labelledby={`scope-${clave}`}
                  disabled={guardar.isPending || !hayDatos}
                  onClick={() => guardar.mutate({ ...scope.data, [clave]: !encendido })}
                  className={`relative h-6 w-11 flex-none rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${
                    encendido && hayDatos ? 'bg-brand' : 'bg-line-strong'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                      encendido && hayDatos ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {guardar.isError && (
        <p role="alert" className="border-t border-line-soft px-5 py-3 text-[13px] text-danger">
          No pudimos guardar el cambio, probá de nuevo.
        </p>
      )}
    </section>
  );
}
