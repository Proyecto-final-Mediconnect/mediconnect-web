import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { SideDrawer } from '../../../shared/ui/SideDrawer';
import { useMyProfile } from '../../patient-profile/hooks/usePatientProfile';
import { VitalInfoForm, type VitalSection } from '../../patient-profile/components/VitalInfoForm';
import { useMyScope, useUpdateScope } from '../hooks/useMediPass';
import { recortarPorScope } from '../lib/medipass';
import type { MediPassScope, VitalBlock } from '../types/medipass';
import { VitalBlockCard } from './VitalBlockCard';

/** Un bloque del MediPass: qué interruptor lo gobierna y qué panel lo edita. */
type Bloque = {
  clave: keyof MediPassScope;
  seccion: VitalSection;
  titulo: string;
  /** Título del panel de edición, cuando edita algo más que el bloque. */
  panel?: string;
};

/** En el orden en que los lee un médico: lo que cambia qué te puede dar, primero. */
const BLOQUES: Bloque[] = [
  { clave: 'alergias', seccion: 'alergias', titulo: 'Alergias' },
  { clave: 'medicacion', seccion: 'medicacion', titulo: 'Medicación' },
  { clave: 'condiciones', seccion: 'condiciones', titulo: 'Condiciones' },
  {
    clave: 'grupoSanguineo',
    seccion: 'basicos',
    titulo: 'Grupo sanguíneo',
    panel: 'Grupo sanguíneo y sexo',
  },
  { clave: 'contacto', seccion: 'contacto', titulo: 'Contacto de emergencia' },
];

/** Lo cargado de un bloque, como chips. Vacío si no hay nada. */
function contenido(vital: VitalBlock, clave: keyof MediPassScope): ReactNode[] {
  switch (clave) {
    case 'alergias':
      return (vital.alergias ?? []).map((a) => (
        <Chip key={a.que} tono="alerta">
          {a.que}
          {a.gravedad && <span className="font-medium opacity-75"> · {a.gravedad}</span>}
        </Chip>
      ));
    case 'medicacion':
      return (vital.medicacion ?? []).map((m) => (
        <Chip key={m.droga}>
          {m.droga}
          {m.dosis && <span className="font-medium text-muted"> · {m.dosis}</span>}
        </Chip>
      ));
    case 'condiciones':
      return (vital.condiciones ?? []).map((c) => (
        <Chip key={c.nombre}>
          {c.nombre}
          {c.codigo && (
            <span className="whitespace-nowrap font-mono font-medium text-muted"> {c.codigo}</span>
          )}
        </Chip>
      ));
    case 'grupoSanguineo':
      return vital.grupoSanguineo
        ? [
            <Chip key="grupo" tono="fuerte">
              {vital.grupoSanguineo}
            </Chip>,
          ]
        : [];
    case 'contacto':
      return vital.contacto
        ? [
            <span key="contacto" className="text-[13px] text-ink">
              <span className="font-semibold text-brand-deep">{vital.contacto.nombre}</span>
              {vital.contacto.vinculo && ` (${vital.contacto.vinculo})`}
              <span className="text-muted"> · </span>
              <span className="tabular-nums">{vital.contacto.telefono}</span>
            </span>,
          ]
        : [];
  }
}

/**
 * Los datos de emergencia del MediPass, en un solo lugar (ENG-136, ENG-149): qué
 * tenés cargado, si lo ve o no quien escanea tu código, y el botón para editarlo.
 *
 * Antes eran tres cosas en dos pantallas —un formulario largo en el perfil, los
 * interruptores acá y la vista previa abajo—, y para cambiar una alergia había
 * que ir y volver. Ahora cada bloque se edita en un panel lateral sin salir del
 * MediPass, y la ficha en inglés que lee el médico queda a un toque.
 */
export function EmergencyData({ vital }: { vital: VitalBlock }) {
  const scope = useMyScope();
  const guardarScope = useUpdateScope();
  // Se pide ya: el panel de edición arranca de los datos del perfil.
  const perfil = useMyProfile();
  const [editando, setEditando] = useState<Bloque | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const { hash } = useLocation();

  // Los avisos de "MediPass vacío" del perfil traen hasta acá.
  useEffect(() => {
    if (hash === '#emergencias') ref.current?.scrollIntoView?.({ block: 'start' });
  }, [hash]);

  const vacio = BLOQUES.every(({ clave }) => contenido(vital, clave).length === 0);

  return (
    <section
      ref={ref}
      id="emergencias"
      aria-labelledby="emergencias-titulo"
      className="scroll-mt-24 overflow-hidden rounded-[14px] border border-line bg-white"
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-line-soft px-5 py-4">
        <div className="min-w-0 flex-1 basis-[260px]">
          <h2 id="emergencias-titulo" className="text-[17px] font-bold text-brand-deep">
            Tus datos de emergencia
          </h2>
          <p className="mt-1 text-[13px] leading-[1.6] text-muted">
            Lo que ve un médico que no te conoce. Tu nombre, edad y sexo siempre se ven; lo demás lo
            prendés o apagás vos, y vale también para quien ya está mirando.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVistaPrevia(true)}
          className="inline-flex flex-none items-center gap-2 rounded-full border border-line-strong px-3.5 py-2 text-[13px] font-semibold text-brand-deep transition-colors hover:border-brand hover:bg-surface-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10Z" />
            <circle cx="10" cy="10" r="2.4" />
          </svg>
          Ver como lo ve un médico
        </button>
      </header>

      {vacio && (
        <p className="border-b border-brand/20 bg-surface-teal px-5 py-3 text-[13px] leading-[1.6] text-brand-deep">
          <strong className="font-bold">Tu MediPass está casi vacío.</strong> Si te escanean hoy,
          solo ven tu nombre y tu edad. Empezá por las alergias y un contacto.
        </p>
      )}

      {guardado && (
        <p
          role="status"
          className="flex items-center gap-2 border-b border-line-soft bg-surface-teal/60 px-5 py-2.5 text-[13px] font-semibold text-brand-hover"
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
          Guardado: ya se ve en tu MediPass.
        </p>
      )}

      <ul className="divide-y divide-line-soft">
        {BLOQUES.map((bloque) => {
          const { clave, titulo } = bloque;
          const items = contenido(vital, clave);
          const hayDatos = items.length > 0;
          const visible = scope.data ? scope.data[clave] : true;
          return (
            <li key={clave} className="px-5 py-4">
              <div className="flex items-center gap-3">
                <h3
                  id={`scope-${clave}`}
                  className="min-w-0 flex-1 text-[14px] font-semibold text-brand-deep"
                >
                  {titulo}
                </h3>
                {hayDatos && !visible && (
                  <span className="rounded-full bg-line-soft px-2.5 py-1 text-[11px] font-semibold text-muted">
                    Oculto al escanear
                  </span>
                )}
                {scope.data && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={visible}
                    aria-labelledby={`scope-${clave}`}
                    title={visible ? 'Lo ve quien escanea' : 'No lo ve quien escanea'}
                    disabled={guardarScope.isPending || !hayDatos}
                    onClick={() => guardarScope.mutate({ ...scope.data, [clave]: !visible })}
                    className={`relative h-6 w-11 flex-none rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${
                      visible && hayDatos ? 'bg-brand' : 'bg-line-strong'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute top-0.5 left-0 size-5 rounded-full bg-white shadow transition-transform ${
                        visible && hayDatos ? 'translate-x-[22px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                )}
              </div>

              <div
                className={`mt-2.5 flex flex-wrap items-center gap-1.5 transition-opacity ${
                  hayDatos && !visible ? 'opacity-50' : ''
                }`}
              >
                {hayDatos ? items : <span className="text-[13px] text-muted-soft">Sin cargar</span>}
                {clave === 'grupoSanguineo' && vital.sexo && (
                  <span className="text-[13px] text-muted">· Sexo {vital.sexo.toLowerCase()}</span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setGuardado(false);
                    setEditando(bloque);
                  }}
                  aria-label={`${hayDatos ? 'Editar' : 'Agregar'} ${titulo.toLowerCase()}`}
                  className="ml-0.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold text-brand-hover transition-colors hover:bg-surface-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {hayDatos ? (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      className="size-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinejoin="round"
                    >
                      <path d="M12.5 4.5l3 3L8 15H5v-3l7.5-7.5Z" />
                    </svg>
                  ) : (
                    <span aria-hidden="true" className="text-[15px] leading-none">
                      +
                    </span>
                  )}
                  {hayDatos ? 'Editar' : 'Agregar'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {(scope.isError || guardarScope.isError) && (
        <p role="alert" className="border-t border-line-soft px-5 py-3 text-[13px] text-danger">
          {guardarScope.isError
            ? 'No pudimos guardar el cambio, probá de nuevo.'
            : 'No pudimos cargar qué se muestra.'}
        </p>
      )}

      <SideDrawer
        open={editando !== null}
        title={editando?.panel ?? editando?.titulo ?? ''}
        onClose={() => setEditando(null)}
      >
        {editando &&
          (perfil.data ? (
            <VitalInfoForm
              key={editando.clave}
              seccion={editando.seccion}
              onDone={(ok) => {
                setEditando(null);
                setGuardado(ok);
              }}
            />
          ) : perfil.isError ? (
            <p role="alert" className="text-[13px] text-danger">
              {perfil.error.message}
            </p>
          ) : (
            <p role="status" className="text-[13px] text-muted">
              Cargando…
            </p>
          ))}
      </SideDrawer>

      <SideDrawer
        open={vistaPrevia}
        title="Lo que ve un médico"
        onClose={() => setVistaPrevia(false)}
      >
        <div className="grid gap-3">
          <p className="px-1 text-[13px] leading-[1.6] text-muted">
            Está en inglés por si la guardia es en el exterior. Lo que apagaste aparece como “not
            shared”; tus consultas y estudios no se ven nunca.
          </p>
          {/* La ficha recortada: exactamente lo que ve el médico (ENG-149). */}
          <VitalBlockCard vital={recortarPorScope(vital, scope.data)} fill />
        </div>
      </SideDrawer>
    </section>
  );
}

function Chip({
  tono = 'normal',
  children,
}: {
  tono?: 'normal' | 'alerta' | 'fuerte';
  children: ReactNode;
}) {
  const estilos = {
    normal: 'bg-surface text-brand-deep ring-1 ring-line',
    // Las alergias en rojo, igual que en la ficha del médico: es lo que cambia
    // qué te pueden dar.
    alerta: 'bg-danger/10 text-danger',
    fuerte: 'bg-brand-deep text-white font-mono tracking-wide',
  }[tono];
  return (
    <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${estilos}`}>
      {children}
    </span>
  );
}
