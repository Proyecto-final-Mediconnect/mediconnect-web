import { useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Caso } from '../features/juego/lib/casos';
import {
  formatearCodigo,
  leerCodigo,
  ROTACION_JUEGO_MS,
  type Lectura,
} from '../features/juego/lib/codigo';
import { usePageBackground } from '../shared/hooks/usePageBackground';
import { Logo } from '../shared/ui/Logo';

/**
 * Lo que ve el celular al escanear el QR del juego "Médico de guardia".
 *
 * Se parece a la vista de emergencia real a propósito: es el producto, con
 * pacientes inventados. La diferencia es que acá la ficha está en español
 * —el público es de acá— y el código lo valida el propio celular.
 *
 * El código se lee **una vez**, al abrir: el médico que ya abrió la ficha la
 * sigue viendo aunque el QR rote, igual que una sesión del MediPass real.
 */
/** `--color-abyss`: el fondo de la ficha. */
const FONDO = '#041d28';

export function GuardiaFichaPage() {
  // El mismo azul que la página, también en el rebote del scroll de iOS.
  usePageBackground(FONDO);
  const [params, setParams] = useSearchParams();
  const [lectura, setLectura] = useState<Lectura | null>(() => {
    const c = params.get('c');
    return c ? leerCodigo(c) : null;
  });

  function probar(codigo: string) {
    setLectura(leerCodigo(codigo));
    setParams({ c: codigo }, { replace: true });
  }

  return (
    <main className="min-h-dvh bg-abyss px-4 py-6 text-white">
      <div className="mx-auto w-full max-w-[480px]">
        <div className="flex items-center justify-between gap-3">
          <Logo variant="lockup" tone="light" alt="MediConnect" className="h-7" />
          <span className="rounded-full bg-danger/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-danger">
            Emergencia · solo lectura
          </span>
        </div>

        <div className="mt-6">
          {lectura?.estado === 'VIGENTE' ? (
            <Ficha caso={lectura.caso} />
          ) : (
            <IngresarCodigo
              titulo={
                lectura?.estado === 'VENCIDO'
                  ? 'Código vencido'
                  : lectura?.estado === 'INVALIDO'
                    ? 'Código no reconocido'
                    : 'MediPass del paciente'
              }
              aviso={
                lectura?.estado === 'VENCIDO'
                  ? `Este código ya rotó. Volvé a escanear el QR de la pantalla: cambia cada ${ROTACION_JUEGO_MS / 1000} segundos.`
                  : lectura?.estado === 'INVALIDO'
                    ? 'No reconocemos ese código. Revisalo o escaneá el QR de nuevo.'
                    : null
              }
              onProbar={probar}
            />
          )}
        </div>

        <p className="mt-6 text-center text-[11px] leading-[1.6] text-on-night-faint">
          Paciente ficticio · Juego &ldquo;Médico de guardia&rdquo; · MediConnect, UTN FRC
        </p>
      </div>
    </main>
  );
}

function Ficha({ caso }: { caso: Caso }) {
  return (
    <article className="overflow-hidden rounded-[14px] border border-white/10 bg-night">
      <header className="border-b border-white/10 px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-bright">
          MediPass · Información vital
        </p>
        <h1 className="font-display mt-2 text-[34px] leading-[1.08] text-white">{caso.nombre}</h1>
        <p className="mt-1.5 text-[14px] text-on-night">
          {caso.sexo} · {caso.edad} años · {caso.pesoKg} kg
        </p>
      </header>

      <div className="grid gap-5 px-5 py-5">
        <div className="flex items-center justify-between rounded-[10px] bg-white/5 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-night-soft">
            Grupo sanguíneo
          </p>
          <p className="font-mono text-[26px] font-bold text-white">{caso.grupoSanguineo}</p>
        </div>

        <Bloque titulo="Alergias" destacado>
          {caso.alergias.length === 0 ? (
            <p className="text-[16px] font-semibold text-white">Sin alergias conocidas</p>
          ) : (
            caso.alergias.map((a) => (
              <p key={a} className="text-[17px] font-bold text-danger">
                {a}
              </p>
            ))
          )}
        </Bloque>

        <Bloque titulo="Condiciones">
          {caso.condiciones.length === 0 ? (
            <p className="text-[16px] font-semibold text-white">Ninguna registrada</p>
          ) : (
            caso.condiciones.map((c) => (
              <p key={c} className="text-[17px] font-semibold text-white">
                {c}
              </p>
            ))
          )}
        </Bloque>

        <Bloque titulo="Medicación habitual">
          {caso.medicacion.length === 0 ? (
            <p className="text-[16px] font-semibold text-white">Ninguna</p>
          ) : (
            caso.medicacion.map((m) => (
              <p key={m} className="text-[17px] font-semibold text-white">
                {m}
              </p>
            ))
          )}
        </Bloque>

        <Bloque titulo="Contacto de emergencia">
          <p className="text-[17px] font-semibold text-white">
            {caso.contacto.nombre} · {caso.contacto.vinculo}
          </p>
          <p className="font-mono text-[15px] text-brand-bright">{caso.contacto.telefono}</p>
        </Bloque>
      </div>

      <p className="border-t border-white/10 px-5 py-4 text-[13px] leading-[1.55] text-on-night-soft">
        Ya podés elegir el tratamiento en la pantalla de la guardia.
      </p>
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
      <h2
        className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
          destacado ? 'text-danger' : 'text-on-night-soft'
        }`}
      >
        {titulo}
      </h2>
      <div className="mt-1.5 grid gap-1">{children}</div>
    </section>
  );
}

function IngresarCodigo({
  titulo,
  aviso,
  onProbar,
}: {
  titulo: string;
  aviso: string | null;
  onProbar: (c: string) => void;
}) {
  const [codigo, setCodigo] = useState('');

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (codigo.trim()) onProbar(codigo);
  }

  return (
    <section className="rounded-[14px] bg-white px-5 py-6 text-ink">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-danger">
        Acceso de emergencia
      </p>
      <h1 className="font-display mt-2 text-[28px] leading-[1.15] text-brand-deep">{titulo}</h1>
      <p className="mt-2 text-[15px] leading-[1.55] text-muted">
        {aviso ?? 'Escaneá el QR de la pantalla, o tipeá el código que aparece debajo.'}
      </p>
      <form onSubmit={enviar} className="mt-5 grid gap-3">
        <label htmlFor="codigo" className="text-[13px] font-semibold text-ink">
          Código
        </label>
        <input
          id="codigo"
          value={formatearCodigo(codigo)}
          onChange={(e) =>
            setCodigo(e.target.value.replace(/[\s-]/g, '').toUpperCase().slice(0, 6))
          }
          placeholder="ABC-123"
          autoComplete="off"
          autoCapitalize="characters"
          className="rounded-[10px] border border-line-strong px-4 py-3 font-mono text-[20px] tracking-[0.12em] text-ink focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-[10px] bg-brand px-5 py-3 text-[15px] font-bold text-ink-deep hover:bg-brand-hover hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-deep"
        >
          Ver MediPass
        </button>
      </form>
    </section>
  );
}
