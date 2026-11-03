import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../features/auth/hooks/useSession';
import { FRASE_DE_BAJA } from '../features/privacy/api/privacyApi';
import {
  useDeleteAccount,
  useDownloadMyData,
  usePreferences,
  useUpdatePreferences,
} from '../features/privacy/hooks/usePrivacy';
import { DashboardLayout } from './DashboardLayout';

/**
 * Privacidad y datos: los derechos ARCO de la Ley 25.326 (ENG-86), en una
 * pantalla para los tres roles.
 *
 * Se llega aunque la persona no haya aceptado los términos vigentes
 * (`RequireAuth` con `skipLegal`): quien no los quiere aceptar tiene que poder
 * llevarse sus datos o irse, y por eso la pantalla de aceptación tiene un
 * enlace acá.
 */
export function PrivacyPage() {
  const { user } = useSession();
  const esPaciente = user?.role === 'PACIENTE';

  return (
    <DashboardLayout
      barTitle="Privacidad y datos"
      subtitle="Tus derechos sobre tus datos personales, según la Ley 25.326."
    >
      <div className="grid max-w-[760px] gap-5">
        <DescargarDatos />
        <Rectificar rol={user?.role} />
        {esPaciente && <Recordatorios />}
        <DarDeBaja esPaciente={esPaciente} />
      </div>
    </DashboardLayout>
  );
}

function Tarjeta({
  id,
  titulo,
  children,
  peligro = false,
}: {
  id: string;
  titulo: string;
  children: React.ReactNode;
  peligro?: boolean;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`grid gap-3 rounded-[18px] border bg-white p-5 sm:p-6 ${
        peligro ? 'border-danger/40' : 'border-line'
      }`}
    >
      <h2
        id={id}
        className={`font-display text-[20px] leading-tight ${peligro ? 'text-danger' : 'text-brand-deep'}`}
      >
        {titulo}
      </h2>
      {children}
    </section>
  );
}

const TEXTO = 'text-[14px] leading-[1.6] text-muted';
const BOTON =
  'justify-self-start rounded-full bg-brand-deep px-5 py-2.5 text-[14px] font-semibold text-white disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand';

/** Acceso (art. 14). */
function DescargarDatos() {
  const descargar = useDownloadMyData();
  return (
    <Tarjeta id="acceso" titulo="Descargar tus datos">
      <p className={TEXTO}>
        Un archivo con todo lo que MediConnect guarda de vos: tu cuenta, tus turnos y pagos, tu
        historia clínica completa, quién la leyó, tu MediPass, tus mensajes y tus reseñas. Está en
        formato JSON, que se puede abrir con cualquier editor de texto o llevar a otro sistema.
      </p>
      <button
        type="button"
        onClick={() => descargar.mutate()}
        disabled={descargar.isPending}
        className={BOTON}
      >
        {descargar.isPending ? 'Preparando…' : 'Descargar mis datos'}
      </button>
      {descargar.isError && (
        <p role="alert" className="text-[13px] font-semibold text-danger">
          {descargar.error.message}
        </p>
      )}
    </Tarjeta>
  );
}

/** Rectificación (art. 16): las pantallas donde ya se editan los datos. */
function Rectificar({ rol }: { rol: string | undefined }) {
  const perfil = rol === 'PACIENTE' ? '/perfil/paciente' : rol === 'PROFESIONAL' ? '/perfil' : null;
  return (
    <Tarjeta id="rectificacion" titulo="Corregir tus datos">
      <p className={TEXTO}>
        {perfil ? (
          <>
            Tus datos personales se corrigen desde{' '}
            <Link
              to={perfil}
              className="font-semibold text-brand-deep underline underline-offset-2"
            >
              tu perfil
            </Link>
            .{' '}
          </>
        ) : null}
        {rol === 'PACIENTE' &&
          'La historia clínica no se edita: si una entrada tiene un error, el profesional que la escribió la corrige con una entrada nueva, y las dos quedan a la vista. Pedíselo por mensaje.'}
        {rol === 'MODERADOR' && 'Para corregir tu email o tu nombre, escribinos.'}
      </p>
    </Tarjeta>
  );
}

/** Oposición (art. 27): lo único que no es imprescindible, los recordatorios. */
function Recordatorios() {
  const preferencias = usePreferences();
  const guardar = useUpdatePreferences();
  const activos = preferencias.data?.recordatoriosPorEmail ?? false;

  return (
    <Tarjeta id="oposicion" titulo="Recordatorios por email">
      <label className="flex items-start justify-between gap-4">
        <span className={TEXTO}>
          Te escribimos 24 horas y 1 hora antes de cada turno. Si no los querés, apagalos: la
          confirmación de cada reserva te va a seguir llegando, porque es el comprobante de lo que
          reservaste.
        </span>
        <input
          type="checkbox"
          role="switch"
          aria-label="Recibir recordatorios por email"
          checked={activos}
          disabled={!preferencias.data || guardar.isPending}
          onChange={(e) => guardar.mutate({ recordatoriosPorEmail: e.target.checked })}
          className="mt-1 size-5 flex-none accent-[var(--color-brand-deep)]"
        />
      </label>
      {(preferencias.isError || guardar.isError) && (
        <p role="alert" className="text-[13px] font-semibold text-danger">
          {preferencias.isError ? preferencias.error.message : guardar.error?.message}
        </p>
      )}
    </Tarjeta>
  );
}

/** Supresión (art. 16): la baja, con lo que se borra y lo que se conserva. */
function DarDeBaja({ esPaciente }: { esPaciente: boolean }) {
  const navigate = useNavigate();
  const baja = useDeleteAccount();
  const [frase, setFrase] = useState('');
  const coincide = frase.trim() === FRASE_DE_BAJA;

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!coincide) return;
    baja.mutate(FRASE_DE_BAJA, {
      onSuccess: () => navigate('/ingresar?baja=1', { replace: true }),
    });
  }

  return (
    <Tarjeta id="supresion" titulo="Dar de baja tu cuenta" peligro>
      <p className={TEXTO}>
        No se puede deshacer. Antes, cancelá los turnos que tengas pendientes.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[12px] bg-surface p-4">
          <p className="text-[13px] font-bold text-brand-deep">Lo que se borra</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] leading-[1.5] text-muted">
            <li>Tu email, teléfono y domicilio</li>
            {esPaciente ? (
              <>
                <li>Tus datos de emergencia y tu MediPass</li>
                <li>Tus reseñas y los documentos que subiste</li>
              </>
            ) : (
              <li>Tu perfil público y tu agenda</li>
            )}
            <li>Tus avisos, y tu acceso a la cuenta</li>
          </ul>
        </div>
        <div className="rounded-[12px] bg-surface p-4">
          <p className="text-[13px] font-bold text-brand-deep">
            Lo que la ley nos obliga a guardar
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] leading-[1.5] text-muted">
            <li>
              {esPaciente
                ? 'Tu historia clínica, 10 años desde la última atención (Ley 26.529)'
                : 'Las entradas de historia clínica que firmaste (Ley 26.529)'}
            </li>
            <li>La constancia de que aceptaste el tratamiento de tus datos</li>
            <li>Los pagos, que son registros contables</li>
          </ul>
        </div>
      </div>

      <form onSubmit={enviar} className="grid gap-3">
        <label htmlFor="frase" className="text-[13px] font-semibold text-brand-deep">
          Para confirmar, escribí <span className="font-mono">{FRASE_DE_BAJA}</span>
        </label>
        <input
          id="frase"
          value={frase}
          onChange={(e) => setFrase(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="min-h-11 rounded-[10px] border border-line-strong px-4 font-mono text-[15px] focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/30"
        />
        <button
          type="submit"
          disabled={!coincide || baja.isPending}
          className="justify-self-start rounded-full bg-danger px-5 py-2.5 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        >
          {baja.isPending ? 'Dando de baja…' : 'Dar de baja mi cuenta'}
        </button>
        {baja.isError && (
          <p role="alert" className="text-[13px] font-semibold text-danger">
            {baja.error.message}
          </p>
        )}
      </form>
    </Tarjeta>
  );
}
