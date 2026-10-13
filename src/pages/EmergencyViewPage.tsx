import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getEmergencySession,
  openEmergencySession,
  SESION_VENCIDA,
} from '../features/medipass/api/medipassApi';
import { VitalBlockCard } from '../features/medipass/components/VitalBlockCard';
import { cuentaRegresiva, formatCodigo } from '../features/medipass/lib/medipass';
import type { EmergencySession } from '../features/medipass/types/medipass';
import { useNow } from '../shared/hooks/useNow';
import { Logo } from '../shared/ui/Logo';

/** Dónde se guarda el acceso abierto: sobrevive a recargar la página, no a cerrar la pestaña. */
const CLAVE_SESION = 'medipass.sesion';

function sesionGuardada(): string | null {
  try {
    return sessionStorage.getItem(CLAVE_SESION);
  } catch {
    return null;
  }
}

function guardarSesion(id: string | null): void {
  try {
    if (id) sessionStorage.setItem(CLAVE_SESION, id);
    else sessionStorage.removeItem(CLAVE_SESION);
  } catch {
    // Sin storage (modo privado): el acceso dura lo que la pestaña abierta.
  }
}

/**
 * Vista de emergencia del MediPass (ENG-135, ENG-73). **Es pública**: la abre un
 * médico de guardia que escaneó el QR del paciente con la cámara de su
 * celular, sin cuenta ni app.
 *
 * 1. El QR trae el código en la URL (`?codigo=`). El médico pone su nombre y,
 *    si quiere, su matrícula: el acceso queda registrado a su nombre.
 * 2. `POST /medipass/sessions` abre un acceso de 30 minutos (ENG-104) y
 *    devuelve el bloque vital. El código sale de la URL apenas se usa, para que
 *    no quede en el historial del navegador.
 * 3. Si el acceso vence (410), vuelve a pedir el código.
 *
 * Código inexistente y código vencido muestran el mismo mensaje: distinguirlos
 * le diría a quien prueba códigos cuáles existieron.
 */
export function EmergencyViewPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [sesionId, setSesionId] = useState<string | null>(sesionGuardada);
  const [aviso, setAviso] = useState<string | null>(null);

  function cerrar(mensaje: string | null): void {
    guardarSesion(null);
    setSesionId(null);
    setAviso(mensaje);
  }

  return (
    <main className="min-h-dvh bg-night px-4 py-6 sm:py-10">
      <div className="mx-auto grid w-full max-w-[560px] gap-6">
        <Logo tone="light" className="h-7" alt="MediConnect" />

        {sesionId ? (
          <AccesoAbierto
            sesionId={sesionId}
            onVencido={(mensaje) => cerrar(mensaje)}
            onTerminar={() => cerrar(null)}
          />
        ) : (
          <PedirAcceso
            codigoInicial={params.get('codigo') ?? ''}
            aviso={aviso}
            onAbierto={(sesion) => {
              guardarSesion(sesion.sesionId);
              setAviso(null);
              setSesionId(sesion.sesionId);
              // El código no se queda en la barra ni en el historial.
              navigate('/medipass/emergencia', { replace: true });
            }}
          />
        )}
      </div>
    </main>
  );
}

function PedirAcceso({
  codigoInicial,
  aviso,
  onAbierto,
}: {
  codigoInicial: string;
  aviso: string | null;
  onAbierto: (sesion: EmergencySession) => void;
}) {
  const [codigo, setCodigo] = useState(formatCodigo(codigoInicial));
  const [nombre, setNombre] = useState('');
  const [matricula, setMatricula] = useState('');
  const [faltan, setFaltan] = useState(false);
  const abrir = useMutation({ mutationFn: openEmergencySession, onSuccess: onAbierto });

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!codigo.trim() || !nombre.trim()) {
      setFaltan(true);
      return;
    }
    setFaltan(false);
    abrir.mutate({ codigo, nombre, matricula });
  }

  const error = faltan
    ? 'Completá el código y tu nombre.'
    : abrir.isError
      ? abrir.error.message
      : aviso;

  return (
    <section className="rounded-[14px] bg-white px-6 py-7 shadow-[0_18px_40px_rgba(4,29,40,0.35)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-danger">
        Acceso de emergencia
      </p>
      <h1 className="font-display mt-2 text-[28px] leading-[1.15] text-brand-deep">
        Información vital del paciente
      </h1>
      <p className="mt-2 text-[14px] leading-[1.6] text-muted">
        Ingresá tu nombre para ver alergias, medicación y contacto de emergencia. El acceso dura 30
        minutos y queda registrado.
      </p>

      <form onSubmit={enviar} noValidate className="mt-6 grid gap-4">
        <Campo
          id="codigo"
          label="Código MediPass"
          value={codigo}
          onChange={setCodigo}
          autoComplete="off"
          mono
        />
        <Campo
          id="nombre"
          label="Tu nombre y apellido"
          value={nombre}
          onChange={setNombre}
          autoComplete="name"
          autoFocus={codigoInicial !== ''}
        />
        <Campo
          id="matricula"
          label="Matrícula (opcional)"
          value={matricula}
          onChange={setMatricula}
          autoComplete="off"
        />

        {error && (
          <p
            role="alert"
            className="rounded-[10px] border border-danger/30 bg-danger/5 px-4 py-3 text-[14px] font-semibold text-danger"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={abrir.isPending}
          className="mt-1 rounded-[9px] bg-brand-deep py-3.5 text-[15px] font-bold text-white transition-opacity disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {abrir.isPending ? 'Abriendo…' : 'Ver información vital'}
        </button>
      </form>
    </section>
  );
}

function Campo({
  id,
  label,
  value,
  onChange,
  autoComplete,
  autoFocus = false,
  mono = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  autoFocus?: boolean;
  mono?: boolean;
}) {
  return (
    <label htmlFor={id} className="grid gap-1.5">
      <span className="text-[13px] font-semibold text-brand-deep">{label}</span>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        autoCapitalize={mono ? 'characters' : 'words'}
        spellCheck={false}
        className={`min-h-12 rounded-[10px] border border-line-strong bg-white px-4 text-[16px] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 ${
          mono ? 'font-mono tracking-[0.12em]' : ''
        }`}
      />
    </label>
  );
}

function AccesoAbierto({
  sesionId,
  onVencido,
  onTerminar,
}: {
  sesionId: string;
  onVencido: (mensaje: string) => void;
  onTerminar: () => void;
}) {
  const now = useNow(1000);
  const sesion = useQuery({
    queryKey: ['medipass', 'session', sesionId],
    queryFn: () => getEmergencySession(sesionId),
    // Cada minuto: si el paciente lo revocó o venció, la pantalla se entera.
    refetchInterval: 60_000,
    retry: false,
  });

  const expiraEl = sesion.data?.expiraEl;
  const vital = sesion.data?.vital;
  const restante = expiraEl ? new Date(expiraEl).getTime() - now.getTime() : null;
  const vencio = sesion.isError || (restante !== null && restante <= 0);

  // Vencido o revocado: vuelve al formulario con el motivo.
  useEffect(() => {
    if (!vencio) return;
    onVencido(sesion.isError ? sesion.error.message : SESION_VENCIDA);
  }, [vencio, onVencido, sesion.isError, sesion.error]);

  if (vencio) return null;

  if (!vital || restante === null) {
    return (
      <p role="status" className="text-center text-[14px] text-on-night">
        Abriendo el MediPass…
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <VitalBlockCard
        vital={vital}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-4 sm:px-7">
            <p role="timer" className="text-[12px] text-on-night-soft">
              Access expires in{' '}
              <span className="font-bold tabular-nums text-brand-bright">
                {cuentaRegresiva(restante)}
              </span>
            </p>
            <button
              type="button"
              onClick={onTerminar}
              className="rounded-[8px] border border-white/20 px-4 py-2 text-[13px] font-bold text-white hover:border-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright"
            >
              Terminar acceso
            </button>
          </div>
        }
      />
      <p className="text-center text-[12px] leading-[1.6] text-on-night-soft">
        This access is logged and limited to the vital block. Full clinical notes require the
        patient&rsquo;s explicit authorization.
      </p>
    </div>
  );
}
