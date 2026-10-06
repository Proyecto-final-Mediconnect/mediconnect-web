import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { MonitorEcg } from '../features/juego/components/MonitorEcg';
import {
  armarGuardia,
  PACIENTES_POR_GUARDIA,
  type Caso,
  type Opcion,
} from '../features/juego/lib/casos';
import {
  codigoDe,
  formatearCodigo,
  msHastaRotar,
  ROTACION_JUEGO_MS,
  urlDeFicha,
  ventanaDe,
} from '../features/juego/lib/codigo';
import {
  borrarRanking,
  formatearTiempo,
  guardarMarca,
  leerRanking,
  type Marca,
} from '../features/juego/lib/ranking';
import { sonido } from '../features/juego/lib/sonido';
import { useNow } from '../shared/hooks/useNow';
import { Logo } from '../shared/ui/Logo';
import { MediPassQr } from '../shared/ui/MediPassQr';

/**
 * "Médico de guardia", el juego del stand (jornada del 06/10).
 *
 * Llega un paciente inconsciente. El visitante escanea su MediPass con el
 * celular, lee la ficha y elige el tratamiento antes de que el código rote.
 * Es el caso de uso del producto contado en un minuto: tu información médica
 * disponible para un médico que no te conoce, cuando la necesitás.
 *
 * Corre entera en el navegador: los pacientes son ficticios y el código se
 * verifica en el celular sin servidor (ver `lib/codigo.ts`).
 */

type Fase = 'inicio' | 'jugando' | 'estabilizado' | 'muerto' | 'final';

type Partida = {
  apodo: string;
  pacientes: Caso[];
  indice: number;
  /** Tiempo ya cerrado de los pacientes anteriores. */
  acumuladoMs: number;
  /** Cuándo arrancó el paciente actual; null con el reloj frenado. */
  desde: number | null;
  causa: string | null;
};

const BPM_BASE = 72;

export function GuardiaJuegoPage() {
  const now = useNow(100).getTime();
  const [fase, setFase] = useState<Fase>('inicio');
  const [partida, setPartida] = useState<Partida | null>(null);
  const [ranking, setRanking] = useState<Marca[]>(() => leerRanking());
  const [ultima, setUltima] = useState<{ marca: Marca; puesto: number | null } | null>(null);
  const [conSonido, setConSonido] = useState(true);

  const caso = partida ? partida.pacientes[partida.indice] : null;
  const corriendo = partida?.desde ?? null;
  const tiempoMs = partida ? partida.acumuladoMs + (corriendo ? now - corriendo : 0) : 0;

  // El corazón se acelera mientras el jugador duda: es el reloj, contado de otra forma.
  const bpm =
    fase === 'muerto'
      ? 0
      : fase === 'jugando' && corriendo
        ? Math.min(BPM_BASE + ((now - corriendo) / 1000) * 2.5, 165)
        : BPM_BASE;

  const empezar = useCallback((apodo: string) => {
    sonido.despertar();
    setUltima(null);
    setPartida({
      apodo,
      pacientes: armarGuardia(),
      indice: 0,
      acumuladoMs: 0,
      desde: Date.now(),
      causa: null,
    });
    setFase('jugando');
  }, []);

  const elegir = useCallback(
    (opcion: Opcion) => {
      if (fase !== 'jugando' || !partida?.desde) return;
      const transcurrido = Date.now() - partida.desde;
      if (opcion.correcta) {
        if (conSonido) sonido.estabilizado();
        setPartida({ ...partida, acumuladoMs: partida.acumuladoMs + transcurrido, desde: null });
        setFase('estabilizado');
      } else {
        if (conSonido) sonido.muerte();
        setPartida({ ...partida, desde: null, causa: opcion.causa ?? null });
        setFase('muerto');
      }
    },
    [fase, partida, conSonido],
  );

  const siguiente = useCallback(() => {
    if (!partida) return;
    if (partida.indice + 1 < partida.pacientes.length) {
      setPartida({ ...partida, indice: partida.indice + 1, desde: Date.now() });
      setFase('jugando');
      return;
    }
    const marca: Marca = {
      apodo: partida.apodo,
      ms: partida.acumuladoMs,
      fecha: new Date().toISOString(),
    };
    const resultado = guardarMarca(marca);
    setRanking(resultado.ranking);
    setUltima({ marca, puesto: resultado.puesto });
    setFase('final');
  }, [partida]);

  const volverAlInicio = useCallback(() => {
    setPartida(null);
    setFase('inicio');
  }, []);

  // Teclado: 1-2-3 para elegir, Enter para seguir. El que atiende el stand
  // puede manejar el ritmo sin tocar el mouse.
  useEffect(() => {
    const alTocar = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (fase === 'jugando' && caso && ['1', '2', '3'].includes(e.key)) {
        elegir(caso.opciones[Number(e.key) - 1]);
      } else if (e.key === 'Enter') {
        if (fase === 'estabilizado') siguiente();
        else if (fase === 'muerto' && partida) empezar(partida.apodo);
        else if (fase === 'final') volverAlInicio();
      }
    };
    window.addEventListener('keydown', alTocar);
    return () => window.removeEventListener('keydown', alTocar);
  }, [fase, caso, partida, elegir, siguiente, empezar, volverAlInicio]);

  return (
    <main className="flex min-h-dvh flex-col bg-abyss text-white">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4 lg:px-10">
        <div className="flex items-center gap-4">
          <Logo variant="lockup" tone="light" alt="MediConnect" className="h-8" />
          <span className="hidden h-6 w-px bg-white/15 sm:block" />
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-on-night-soft">
            Médico de guardia
          </p>
        </div>
        <div className="flex items-center gap-6">
          {partida && fase !== 'inicio' && fase !== 'final' && (
            <>
              <Dato etiqueta="Médico" valor={partida.apodo} />
              <Dato
                etiqueta="Paciente"
                valor={`${partida.indice + 1} de ${PACIENTES_POR_GUARDIA}`}
              />
              <Dato etiqueta="Tiempo" valor={formatearTiempo(tiempoMs)} grande />
            </>
          )}
          <button
            type="button"
            onClick={() => setConSonido((s) => !s)}
            className="rounded-full border border-white/15 px-3 py-1.5 text-[12px] font-semibold text-on-night hover:border-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright"
            aria-pressed={conSonido}
          >
            {conSonido ? 'Sonido: sí' : 'Sonido: no'}
          </button>
        </div>
      </header>

      {/* El monitor cruza toda la pantalla: es lo primero que se ve de lejos. */}
      <div className="relative h-[92px] bajo:h-[72px] border-b border-white/10 bg-[#03161f]">
        {/* El trazo termina antes del número, como en un monitor real. */}
        <div className="absolute inset-y-0 left-0 right-[150px] lg:right-[170px]">
          <MonitorEcg
            bpm={bpm}
            onLatido={conSonido && fase === 'jugando' ? sonido.latido : undefined}
          />
        </div>
        <p
          className={`absolute right-6 top-1/2 -translate-y-1/2 font-mono text-[28px] font-bold tabular-nums lg:right-10 ${
            bpm === 0 ? 'text-danger' : 'text-brand-bright'
          }`}
        >
          {Math.round(bpm)} <span className="text-[12px] font-semibold">LPM</span>
        </p>
      </div>

      <div className="flex flex-1 flex-col">
        {fase === 'inicio' && (
          <Inicio
            ranking={ranking}
            onEmpezar={empezar}
            onBorrar={() => {
              borrarRanking();
              setRanking([]);
            }}
          />
        )}
        {caso && (fase === 'jugando' || fase === 'estabilizado') && (
          <Guardia caso={caso} now={now} activa={fase === 'jugando'} onElegir={elegir} />
        )}
        {fase === 'final' && ultima && (
          <Final ultima={ultima} ranking={ranking} onOtro={volverAlInicio} />
        )}
      </div>

      {fase === 'estabilizado' && caso && partida && (
        <Estabilizado
          caso={caso}
          ultimo={partida.indice + 1 === partida.pacientes.length}
          onSeguir={siguiente}
        />
      )}
      {fase === 'muerto' && caso && partida && (
        <Muerte
          caso={caso}
          causa={partida.causa}
          onReintentar={() => empezar(partida.apodo)}
          onSalir={volverAlInicio}
        />
      )}
    </main>
  );
}

function Dato({
  etiqueta,
  valor,
  grande = false,
}: {
  etiqueta: string;
  valor: string;
  grande?: boolean;
}) {
  return (
    <div className="text-right">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-on-night-soft">
        {etiqueta}
      </p>
      <p
        className={`font-semibold tabular-nums text-white ${grande ? 'font-mono text-[26px] leading-none' : 'text-[16px]'}`}
      >
        {valor}
      </p>
    </div>
  );
}

function Inicio({
  ranking,
  onEmpezar,
  onBorrar,
}: {
  ranking: Marca[];
  onEmpezar: (apodo: string) => void;
  onBorrar: () => void;
}) {
  const [apodo, setApodo] = useState('');

  function enviar(e: FormEvent) {
    e.preventDefault();
    const limpio = apodo.trim();
    if (limpio) onEmpezar(limpio);
  }

  return (
    <div className="mx-auto grid w-full max-w-[1200px] flex-1 gap-10 px-6 py-8 bajo:py-6 md:grid-cols-[1.4fr_1fr] lg:px-10 xl:py-14">
      <section>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-danger">
          Ingreso a la guardia
        </p>
        <h1 className="font-display mt-3 text-[44px] leading-[1.02] text-white text-balance lg:text-[60px] xl:text-[76px] bajo:lg:text-[46px] bajo:xl:text-[56px]">
          Llega un paciente inconsciente.
        </h1>
        <p className="mt-5 max-w-[56ch] text-[18px] bajo:mt-3 bajo:text-[16px] leading-[1.55] text-on-night">
          No puede decirte nada. Lo único que tenés es su MediPass. Atendé a tres pacientes lo más
          rápido que puedas, sin matar a ninguno.
        </p>

        <ol className="mt-8 grid gap-3 bajo:mt-5 lg:grid-cols-3">
          {[
            ['Escaneá', 'el QR del paciente con la cámara de tu celular.'],
            ['Leé', 'su MediPass: qué tiene, a qué es alérgico, qué toma.'],
            ['Elegí', 'el tratamiento en esta pantalla. Si te equivocás, se muere.'],
          ].map(([verbo, resto], i) => (
            <li key={verbo} className="rounded-[12px] border border-white/10 bg-night px-4 py-4">
              <p className="font-mono text-[12px] text-brand-bright">{i + 1}</p>
              <p className="mt-1 text-[15px] leading-[1.45] text-on-night-strong">
                <strong className="text-white">{verbo}</strong> {resto}
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[13px] text-on-night-soft">
          El código del QR cambia cada {ROTACION_JUEGO_MS / 1000} segundos. Si tardás, volvé a
          escanear.
        </p>

        <form onSubmit={enviar} className="mt-8 bajo:mt-5 flex max-w-[520px] flex-wrap gap-3">
          <label className="sr-only" htmlFor="apodo">
            Tu apodo
          </label>
          <input
            id="apodo"
            value={apodo}
            onChange={(e) => setApodo(e.target.value.slice(0, 16))}
            placeholder="Tu apodo para la tabla"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-[10px] border border-white/20 bg-night px-4 py-3.5 text-[17px] text-white placeholder:text-on-night-faint focus:border-brand-bright focus:outline-none"
          />
          <button
            type="submit"
            disabled={!apodo.trim()}
            className="rounded-[10px] bg-brand px-6 py-3.5 text-[16px] font-bold text-ink-deep transition hover:bg-brand-bright disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Empezar guardia
          </button>
        </form>
      </section>

      <TablaDeTiempos ranking={ranking} onBorrar={onBorrar} />
    </div>
  );
}

function Guardia({
  caso,
  now,
  activa,
  onElegir,
}: {
  caso: Caso;
  now: number;
  activa: boolean;
  onElegir: (opcion: Opcion) => void;
}) {
  const codigo = codigoDe(caso.id, ventanaDe(now));
  const restante = msHastaRotar(now);
  const origen = window.location.origin;
  const local = /localhost|127\.0\.0\.1/.test(origen);

  return (
    <div className="mx-auto grid w-full max-w-[1280px] flex-1 gap-6 px-6 py-6 bajo:py-4 md:grid-cols-[1.4fr_1fr] lg:gap-8 lg:px-10 xl:py-10">
      <section className="flex flex-col">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-danger">Ingreso</p>
        <h2 className="font-display mt-2 text-[32px] leading-[1.1] text-white text-balance lg:text-[40px] xl:text-[54px] bajo:xl:text-[42px]">
          {caso.ingreso}
        </h2>
        <p className="mt-3 text-[16px] text-on-night">
          {caso.sexo}, {caso.edad} años. No responde preguntas.
        </p>

        <div className="mt-auto pt-6 xl:pt-10 bajo:xl:pt-6">
          <p className="text-[22px] font-bold text-white">{caso.pregunta}</p>
          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            {caso.opciones.map((opcion, i) => (
              <button
                key={opcion.texto}
                type="button"
                disabled={!activa}
                onClick={() => onElegir(opcion)}
                className="group flex min-h-[64px] items-center gap-4 xl:min-h-[132px] bajo:xl:min-h-[100px] xl:flex-col xl:items-start xl:justify-between rounded-[14px] border border-white/15 bg-night px-5 py-4 text-left transition hover:-translate-y-0.5 hover:border-brand-bright hover:bg-[#0a3a4e] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright disabled:pointer-events-none"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-[6px] border border-white/20 font-mono text-[12px] text-on-night-soft group-hover:border-brand-bright group-hover:text-brand-bright">
                  {i + 1}
                </span>
                <span className="text-[20px] font-bold leading-[1.15] text-white xl:text-[24px]">
                  {opcion.texto}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <aside className="flex flex-col items-center rounded-[16px] bg-white px-6 py-7 bajo:py-5 text-center text-ink">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-deep">
          MediPass del paciente
        </p>
        <p className="mt-1 text-[14px] text-muted">Escanealo con la cámara del celular</p>
        <div className="mt-5 rounded-[12px] border border-line p-4">
          <MediPassQr
            key={codigo}
            value={urlDeFicha(origen, codigo)}
            size={248}
            className="h-auto w-full max-w-[248px]"
          />
        </div>
        <p className="mt-4 font-mono text-[26px] font-bold tracking-[0.12em] text-brand-deep">
          {formatearCodigo(codigo)}
        </p>
        <div className="mt-3 w-full max-w-[280px]">
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className={`h-full rounded-full ${restante < 8_000 ? 'bg-danger' : 'bg-brand'}`}
              style={{ width: `${(restante / ROTACION_JUEGO_MS) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[13px] tabular-nums text-muted">
            El código cambia en {Math.ceil(restante / 1000)} s
          </p>
        </div>
        {local && (
          <p className="mt-4 rounded-[8px] bg-tag-warm px-3 py-2 text-[12px] text-tag-warm-ink">
            Abriste el juego con <code>localhost</code>: el celular no va a poder abrir el QR. Usá
            la IP de la red.
          </p>
        )}
      </aside>
    </div>
  );
}

function Estabilizado({
  caso,
  ultimo,
  onSeguir,
}: {
  caso: Caso;
  ultimo: boolean;
  onSeguir: () => void;
}) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-abyss/80 px-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="estabilizado"
        className="w-full max-w-[640px] rounded-[18px] border border-brand-bright/40 bg-night px-8 py-9"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-bright">
          {caso.nombre}
        </p>
        <h2 id="estabilizado" className="font-display mt-2 text-[48px] leading-[1.05] text-white">
          Paciente estabilizado.
        </h2>
        <p className="mt-4 text-[18px] leading-[1.55] text-on-night-strong">{caso.clave}</p>
        <button
          type="button"
          autoFocus
          onClick={onSeguir}
          className="mt-8 rounded-[10px] bg-brand px-6 py-3.5 text-[16px] font-bold text-ink-deep hover:bg-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {ultimo ? 'Ver mi tiempo' : 'Siguiente paciente'}
        </button>
      </div>
    </div>
  );
}

function Muerte({
  caso,
  causa,
  onReintentar,
  onSalir,
}: {
  caso: Caso;
  causa: string | null;
  onReintentar: () => void;
  onSalir: () => void;
}) {
  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-[#120509]">
      <div className="h-[30vh] min-h-[160px] border-b border-danger/20">
        <MonitorEcg bpm={0} />
      </div>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="murio"
        className="mx-auto flex w-full max-w-[860px] flex-1 flex-col justify-center px-6 py-10"
      >
        <p className="font-mono text-[14px] font-bold tracking-[0.2em] text-danger">
          ASISTOLIA · 0 LPM
        </p>
        <h2
          id="murio"
          className="font-display mt-3 text-[56px] leading-[1] text-white lg:text-[88px]"
        >
          {caso.nombre.split(' ')[0]} murió.
        </h2>
        {causa && <p className="mt-5 text-[22px] leading-[1.45] text-[#f3c4ce]">{causa}</p>}
        <div className="mt-8 border-l-2 border-danger pl-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-danger">
            Estaba en su MediPass
          </p>
          <p className="mt-1.5 text-[18px] leading-[1.5] text-white">{caso.clave}</p>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <button
            type="button"
            autoFocus
            onClick={onReintentar}
            className="rounded-[10px] bg-white px-6 py-3.5 text-[16px] font-bold text-[#120509] hover:bg-[#f3c4ce] focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          >
            Volver a intentar
          </button>
          <button
            type="button"
            onClick={onSalir}
            className="rounded-[10px] border border-white/20 px-6 py-3.5 text-[16px] font-semibold text-white hover:border-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Siguiente médico
          </button>
        </div>
      </div>
    </div>
  );
}

function Final({
  ultima,
  ranking,
  onOtro,
}: {
  ultima: { marca: Marca; puesto: number | null };
  ranking: Marca[];
  onOtro: () => void;
}) {
  return (
    <div className="mx-auto grid w-full max-w-[1200px] flex-1 gap-10 px-6 py-8 bajo:py-6 md:grid-cols-[1.4fr_1fr] lg:px-10 xl:py-14">
      <section>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-bright">
          Guardia completa
        </p>
        <h1 className="font-display mt-3 text-[44px] leading-[1.02] text-white lg:text-[56px] xl:text-[72px] bajo:lg:text-[44px] bajo:xl:text-[52px]">
          Salvaste a los tres, {ultima.marca.apodo}.
        </h1>
        <p className="mt-8 font-mono text-[64px] font-bold bajo:mt-5 xl:text-[88px] bajo:xl:text-[64px] leading-none tabular-nums text-white">
          {formatearTiempo(ultima.marca.ms)}
        </p>
        <p className="mt-4 text-[18px] text-on-night">
          {ultima.puesto
            ? `Quedaste ${ultima.puesto}º en la tabla. Anotalo en la pizarra.`
            : 'No entraste al top 10. Probá de nuevo.'}
        </p>
        <p className="mt-8 max-w-[56ch] text-[16px] leading-[1.6] text-on-night-soft">
          En la guardia de verdad pasa lo mismo: el médico no te conoce y vos no podés hablar. Con
          MediPass, tu información vital está a un escaneo.
        </p>
        <button
          type="button"
          autoFocus
          onClick={onOtro}
          className="mt-8 rounded-[10px] bg-brand px-6 py-3.5 text-[16px] font-bold text-ink-deep hover:bg-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Siguiente médico
        </button>
      </section>
      <TablaDeTiempos ranking={ranking} resaltada={ultima.marca} />
    </div>
  );
}

function TablaDeTiempos({
  ranking,
  resaltada,
  onBorrar,
}: {
  ranking: Marca[];
  resaltada?: Marca;
  onBorrar?: () => void;
}) {
  return (
    <aside className="self-start rounded-[16px] border border-white/10 bg-night px-6 py-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-on-night-soft">
          Mejores tiempos
        </h2>
        {onBorrar && ranking.length > 0 && (
          <button
            type="button"
            onClick={() => window.confirm('¿Borrar toda la tabla?') && onBorrar()}
            className="text-[11px] text-on-night-faint hover:text-danger focus:outline-none focus-visible:underline"
          >
            Borrar tabla
          </button>
        )}
      </div>
      {ranking.length === 0 ? (
        <p className="mt-4 text-[15px] text-on-night">Todavía nadie. El primero queda arriba.</p>
      ) : (
        <ol className="mt-4 grid gap-1">
          {ranking.map((marca, i) => (
            <li
              key={`${marca.apodo}-${marca.fecha}`}
              className={`flex items-baseline gap-3 rounded-[8px] px-3 py-2 ${
                marca === resaltada ? 'bg-brand/20' : ''
              }`}
            >
              <span className="w-6 font-mono text-[13px] tabular-nums text-on-night-soft">
                {i + 1}
              </span>
              <span className="flex-1 truncate text-[16px] font-semibold text-white">
                {marca.apodo}
              </span>
              <span className="font-mono text-[16px] tabular-nums text-brand-bright">
                {formatearTiempo(marca.ms)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
