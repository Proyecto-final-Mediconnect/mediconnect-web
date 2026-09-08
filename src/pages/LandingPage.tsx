import { Link } from 'react-router-dom';
import { Logo } from '../shared/ui/Logo';
import { MediPassQr } from '../shared/ui/MediPassQr';
import { PUBLIC_SHELL as SHELL, PublicHeader } from '../shared/ui/PublicHeader';

/**
 * Landing pública (rediseño del canvas "Diseño web Mediconnect").
 *
 * El diseño se apoya en tres cosas y conviene no perderlas al tocarlo:
 *
 * 1. **Dos tipografías con roles fijos.** Newsreader en peso 400 solo para los
 *    títulos display, Manrope para absolutamente todo lo demás. La serif nunca
 *    va en negrita: a 60px se ensucia y pierde el aire que le da el diseño.
 * 2. **Secciones numeradas.** Cada bloque abre con un filete, un número teal y
 *    un eyebrow en mayúsculas. La numeración no es decorativa: ordena el
 *    recorrido de la página (paciente → profesional → MediPass → cómo funciona
 *    → datos → dudas), así que si se agrega o quita una sección hay que
 *    renumerar.
 * 3. **Alternancia de fondos.** Claro, claro teñido y oscuro se turnan para
 *    marcar el ritmo. Los dos bloques `night` son los que cargan el argumento
 *    emocional (el hero y MediPass) y el cierre.
 */

const PARA_PACIENTES = [
  {
    titulo: 'Todo tu historial en un solo lugar',
    texto:
      'Consultas, estudios, indicaciones y medicación quedan ordenados por fecha. Nunca más buscar un estudio en un cajón antes de ir al médico.',
  },
  {
    titulo: 'Atendete desde donde estés',
    texto:
      'Elegís profesional, día y horario, pagás online y entrás a la videoconsulta desde la computadora o el celular.',
  },
  {
    titulo: 'Seguimiento entre consulta y consulta',
    texto:
      'Podés escribirle a tu profesional, cargar tus controles y recibir avisos, sin esperar al próximo turno.',
  },
];

const PARA_PROFESIONALES = [
  {
    titulo: 'Agenda que se maneja sola',
    texto:
      'Publicás tu disponibilidad y el sistema evita superposiciones y avisa a los pacientes.',
  },
  {
    titulo: 'Cobrás por adelantado',
    texto: 'El turno se confirma con el pago acreditado y tenés el detalle de lo cobrado cada mes.',
  },
  {
    titulo: 'Historia clínica seria',
    texto:
      'Registros firmados que no se pueden alterar, con corrección trazable si hace falta rectificar algo.',
  },
  {
    titulo: 'Señales tempranas',
    texto:
      'El sistema te avisa cuando el historial de un paciente muestra un cambio que conviene mirar.',
  },
];

const PASOS = [
  {
    n: '01',
    titulo: 'Buscás quién te puede ayudar',
    texto:
      'Por especialidad, por nombre o describiendo lo que te pasa. Ves precio, calificación y el próximo turno libre.',
  },
  {
    n: '02',
    titulo: 'Reservás y pagás online',
    texto:
      'Elegís el servicio, el día y la hora. Pagás con Mercado Pago y recibís la confirmación por email.',
  },
  {
    n: '03',
    titulo: 'Te atendés por video',
    texto:
      'Entrás a la sala desde tu turno confirmado. El profesional ya tiene a la vista lo importante de tu historia.',
  },
  {
    n: '04',
    titulo: 'Te queda todo registrado',
    texto:
      'Diagnóstico, indicaciones y medicación quedan en tu historia clínica y en tu MediPass, para siempre.',
  },
];

const GARANTIAS = [
  {
    titulo: 'Vos sos el dueño de tu historia clínica',
    texto: 'Podés verla completa, descargarla en PDF y llevártela cuando quieras.',
  },
  {
    titulo: 'Cada acceso queda registrado',
    texto: 'Sabés qué profesional la abrió, cuándo y qué parte miró.',
  },
  {
    titulo: 'Nada se borra ni se edita a escondidas',
    texto:
      'Si un profesional necesita corregir algo, queda como una entrada nueva vinculada a la original.',
  },
  {
    titulo: 'Verificamos a cada profesional',
    texto: 'Nadie publica su perfil sin que su matrícula esté controlada y vigente.',
  },
  {
    titulo: 'Cumplimos la ley argentina de salud digital',
    texto: 'Teleconsulta, derechos del paciente y protección de datos personales.',
  },
];

const FAQS = [
  {
    q: '¿Cuánto cuesta usar MediConnect?',
    a: 'Crear la cuenta y tener tu historia clínica no tiene costo. Pagás únicamente la consulta que reservás, al precio que publica cada profesional.',
  },
  {
    q: '¿La videoconsulta reemplaza al médico de siempre?',
    a: 'No. Sirve para controles, seguimiento y consultas que no requieren examen físico. Ante una urgencia hay que ir a una guardia.',
  },
  {
    q: '¿Puedo cancelar un turno?',
    a: 'Sí. Hasta 24 h antes se devuelve el total; después de ese plazo se reintegra el 50%.',
  },
  {
    q: '¿Quién puede ver mi historia clínica?',
    a: 'Solo vos y los profesionales a los que se la compartas, por el tiempo que vos definas. Podés cortar el acceso cuando quieras.',
  },
  {
    q: '¿Qué pasa si mi médico deja de atender en la plataforma?',
    a: 'Tu historia clínica es tuya y sigue en tu cuenta. Podés compartirla con el próximo profesional en un paso.',
  },
  {
    q: '¿Necesito instalar algo?',
    a: 'No para usarlo desde la computadora. También hay una app para el celular con tus turnos, tu historia y tu MediPass.',
  },
];

const FOOTER_COLUMNS = [
  {
    titulo: 'Pacientes',
    items: ['Buscar profesionales', 'Cómo funciona', 'MediPass', 'Precios'],
  },
  {
    titulo: 'Profesionales',
    items: ['Publicar mi perfil', 'Agenda y cobros', 'Verificar matrícula', 'Ayuda'],
  },
  {
    titulo: 'Legales',
    items: ['Términos y condiciones', 'Privacidad de datos', 'Consentimiento informado'],
  },
];

/** Filete + número + eyebrow con el que abre cada sección. */
function SectionLabel({ n, children, tone = 'light' }: SectionLabelProps) {
  const isDark = tone === 'dark';

  return (
    <div
      className={`flex items-baseline gap-4 border-t pt-4 ${
        isDark ? 'border-white/30' : 'border-brand-deep'
      }`}
    >
      <span
        className={`text-xs font-semibold ${isDark ? 'text-brand-bright' : 'text-brand'}`}
      >
        {n}
      </span>
      <span
        className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
          isDark ? 'text-on-night-soft' : 'text-muted'
        }`}
      >
        {children}
      </span>
    </div>
  );
}

type SectionLabelProps = {
  n: string;
  children: React.ReactNode;
  tone?: 'light' | 'dark';
};

export function LandingPage() {
  return (
    <div className="min-h-svh bg-white">
      <PublicHeader />
      <main>
        <Hero />
        <ParaPacientes />
        <ParaProfesionales />
        <MediPass />
        <ComoFunciona />
        <TusDatos />
        <Faq />
        <CierreCta />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="bg-night text-white">
      <div
        className={`${SHELL} grid items-start gap-12 py-20 lg:grid-cols-[1.06fr_0.94fr] lg:gap-[72px] lg:pb-24 lg:pt-[92px]`}
      >
        <div>
          <div className="flex items-center gap-3">
            <span className="h-px w-[26px] bg-brand-bright" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-bright">
              Consultas por video · Historia clínica · MediPass
            </span>
          </div>

          <h1 className="font-display mt-6 max-w-[640px] text-[42px] leading-[1.06] text-white text-pretty sm:text-[54px] lg:text-[66px]">
            Tu salud, en un solo lugar y siempre con vos.
          </h1>

          <p className="mt-6 max-w-[530px] text-lg leading-[1.65] text-on-night text-pretty">
            Atendete por videoconsulta con profesionales de matrícula verificada, y llevá tu
            historia clínica completa a donde vayas. Cada consulta, estudio e indicación queda
            guardada, ordenada y bajo tu control.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/profesionales"
              className="rounded-[10px] bg-brand px-6 py-[15px] text-[15px] font-bold text-ink-deep transition-colors hover:bg-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-night"
            >
              Buscar un profesional
            </Link>
            <a
              href="#medipass"
              className="rounded-[10px] border border-white/[0.28] px-6 py-[15px] text-[15px] font-semibold text-white transition-colors hover:border-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-night"
            >
              Qué es MediPass
            </a>
          </div>

          <p className="mt-[22px] text-[13px] font-medium text-on-night-faint">
            Crear la cuenta es gratis. Pagás solamente la consulta que reservás.
          </p>
        </div>

        <MediPassCard />
      </div>
    </section>
  );
}

/**
 * Vista previa del MediPass en el hero.
 *
 * Es una ilustración de producto, no un pase real: el QR es decorativo y los
 * datos son de una paciente de ejemplo. MediPass es Release 3.
 */
function MediPassCard() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_40px_80px_-40px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between border-b border-line-soft px-5 py-[15px]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Tu MediPass
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.1em] text-brand-hover">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          AL DÍA
        </span>
      </div>

      <div className="grid items-center gap-5 border-b border-line-soft px-5 py-[22px] sm:grid-cols-[118px_1fr]">
        <MediPassQr size={118} className="rounded-md" />
        <div className="grid gap-[7px]">
          <span className="text-[19px] font-bold text-brand-deep">Marina Sosa · 41</span>
          <span className="text-[11px] font-semibold tracking-[0.06em] text-brand-hover">
            MP-AR-8F42-91C7-D0A3
          </span>
          <span className="text-[13px] font-medium leading-[1.5] text-muted">
            Grupo 0 Rh+ · toma anticoagulantes
            <br />
            Alergia: penicilina
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2">
        <div className="border-r border-line-soft px-5 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-soft">
            Consultas guardadas
          </div>
          <div className="mt-[7px] text-[15px] font-bold text-brand-deep">14 registros</div>
        </div>
        <div className="px-5 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-soft">
            Quién puede verla
          </div>
          <div className="mt-[7px] text-[15px] font-bold text-brand-deep">Solo vos y 2 más</div>
        </div>
      </div>
    </div>
  );
}

function ParaPacientes() {
  return (
    <section className="border-t border-line bg-white">
      <div className={`${SHELL} py-16 lg:py-[92px]`}>
        <SectionLabel n="01">Si sos paciente</SectionLabel>
        <h2 className="font-display mt-6 max-w-[720px] text-[32px] leading-[1.14] text-brand-deep text-pretty lg:text-[44px]">
          Toda tu salud en un mismo lugar, siempre a mano.
        </h2>

        <div className="mt-10 grid gap-11 md:grid-cols-3 lg:mt-[52px]">
          {PARA_PACIENTES.map((b) => (
            <article key={b.titulo} className="border-t border-line pt-[22px]">
              <h3 className="font-display text-2xl leading-[1.25] text-brand-deep">{b.titulo}</h3>
              <p className="mt-2.5 text-[15px] leading-[1.7] text-muted text-pretty">{b.texto}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ParaProfesionales() {
  return (
    <section className="border-y border-line bg-surface">
      <div className={`${SHELL} py-16 lg:py-[92px]`}>
        <SectionLabel n="02">Si sos profesional</SectionLabel>

        <div className="mt-9 grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div>
            <h2 className="font-display text-[30px] leading-[1.14] text-brand-deep text-pretty lg:text-[40px]">
              Tu consultorio, tu agenda y tus pacientes — sin depender de una institución.
            </h2>
            <p className="mt-[18px] text-base leading-[1.7] text-muted text-pretty">
              Publicás tus servicios y tu disponibilidad, cobrás por adelantado y seguís a tus
              pacientes entre consulta y consulta. Si te mudás de ciudad, tu cartera de pacientes se
              muda con vos.
            </p>
            <Link
              to="/registro/profesional"
              className="mt-[26px] inline-block rounded-[9px] bg-brand-deep px-[22px] py-[13px] text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Ver el panel del profesional
            </Link>
          </div>

          <div className="grid gap-px overflow-hidden rounded-[14px] border border-line bg-line sm:grid-cols-2">
            {PARA_PROFESIONALES.map((b) => (
              <div key={b.titulo} className="bg-white px-6 py-[26px]">
                <h3 className="text-base font-bold text-brand-deep">{b.titulo}</h3>
                <p className="mt-[9px] text-sm leading-[1.65] text-muted">{b.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MediPass() {
  return (
    <section id="medipass" className="scroll-mt-20 bg-night text-white">
      <div className={`${SHELL} grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-[92px]`}>
        <div>
          <SectionLabel n="03" tone="dark">
            MediPass
          </SectionLabel>

          <h2 className="font-display mt-6 text-[32px] leading-[1.12] text-white text-pretty lg:text-[42px]">
            Si te pasa algo lejos de casa, tu información llega antes que vos.
          </h2>
          <p className="mt-5 max-w-[520px] text-[17px] leading-[1.7] text-on-night text-pretty">
            MediPass es tu pasaporte médico: un código único que te acompaña toda la vida. Un médico
            de guardia — acá o en otro país — lo escanea y ve al instante tus alergias, tu
            medicación y tus condiciones, traducidas a su idioma.
          </p>

          <ul className="mt-[30px] grid max-w-[520px] gap-3.5">
            {[
              'Vos decidís quién lo ve, qué parte y por cuánto tiempo.',
              'Podés cortar un acceso en cualquier momento, con un toque.',
              'En una emergencia se muestra solo lo indispensable, nunca tu historia completa.',
            ].map((linea) => (
              <li key={linea} className="flex items-start gap-3.5">
                <span className="relative top-2 h-[7px] w-[7px] flex-none rounded-full bg-brand-bright" />
                <span className="text-[15px] font-medium leading-[1.6] text-on-night-strong">
                  {linea}
                </span>
              </li>
            ))}
          </ul>

          <Link
            to="/registro"
            className="mt-8 inline-block rounded-[9px] border border-white/[0.28] px-[22px] py-[13px] text-sm font-semibold text-white transition-colors hover:border-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-night"
          >
            Ver lo que ve el médico de guardia
          </Link>
        </div>

        <div className="flex justify-center">
          <div className="grid max-w-[330px] justify-items-center gap-4 rounded-[18px] bg-white p-[22px] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.5)]">
            <MediPassQr size={230} />
            <div className="text-center">
              <div className="text-[15px] font-bold text-brand-deep">Marina Sosa</div>
              <div className="mt-1 text-[11px] font-semibold tracking-[0.08em] text-brand-hover">
                MP-AR-8F42-91C7-D0A3
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ComoFunciona() {
  return (
    <section className="bg-white">
      <div className={`${SHELL} py-16 lg:py-[92px]`}>
        <SectionLabel n="04">Cómo es atenderse acá</SectionLabel>

        <ol className="mt-11 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {PASOS.map((p) => (
            <li key={p.n} className="border-t-2 border-brand pt-5">
              <div className="text-xs font-semibold tracking-[0.08em] text-brand">{p.n}</div>
              <h3 className="mt-3 text-[17px] font-bold leading-[1.35] text-brand-deep">
                {p.titulo}
              </h3>
              <p className="mt-[9px] text-sm leading-[1.65] text-muted">{p.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function TusDatos() {
  return (
    <section className="border-t border-line bg-white">
      <div className={`${SHELL} grid items-start gap-10 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-[92px]`}>
        <div>
          <SectionLabel n="05">Tus datos son tuyos</SectionLabel>
          <h2 className="font-display mt-6 text-[30px] leading-[1.15] text-brand-deep lg:text-[38px]">
            Nadie entra a tu historia clínica sin que vos lo autorices.
          </h2>
          <p className="mt-4 text-base leading-[1.7] text-muted text-pretty">
            Cada vez que alguien la abre queda registrado quién fue, cuándo y qué miró. Y ningún
            registro se puede borrar ni modificar después de firmado.
          </p>
        </div>

        <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
          {GARANTIAS.map((l) => (
            <li
              key={l.titulo}
              className="grid grid-cols-[26px_1fr] items-start gap-4 border-b border-line-soft px-6 py-5 last:border-b-0"
            >
              <span
                aria-hidden="true"
                className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-surface-teal text-[11px] font-bold text-brand-hover"
              >
                ✓
              </span>
              <span>
                <span className="block text-[15px] font-bold text-brand-deep">{l.titulo}</span>
                <span className="mt-[5px] block text-sm leading-[1.6] text-muted">{l.texto}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="border-t border-line bg-surface">
      <div className={`${SHELL} py-16 lg:py-[92px]`}>
        <SectionLabel n="06">Preguntas frecuentes</SectionLabel>

        <div className="mt-10 grid gap-px overflow-hidden rounded-[14px] border border-line bg-line md:grid-cols-2">
          {FAQS.map((f) => (
            <div key={f.q} className="bg-white px-7 py-[26px]">
              <h3 className="text-base font-bold leading-[1.4] text-brand-deep">{f.q}</h3>
              <p className="mt-[9px] text-sm leading-[1.7] text-muted text-pretty">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CierreCta() {
  return (
    <section className="bg-night text-white">
      <div
        className={`${SHELL} flex flex-wrap items-center justify-between gap-10 py-14 lg:py-[76px]`}
      >
        <div>
          <h2 className="font-display max-w-[560px] text-[30px] leading-[1.15] text-white text-pretty lg:text-[38px]">
            Empezá hoy: buscá tu especialista y llevate tu historia clínica con vos.
          </h2>
          <p className="mt-3 text-base text-on-night">
            Crear la cuenta lleva dos minutos y no tiene costo.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/profesionales"
            className="rounded-[10px] bg-brand px-[26px] py-[15px] text-[15px] font-bold text-ink-deep transition-colors hover:bg-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-night"
          >
            Buscar profesionales
          </Link>
          <Link
            to="/registro"
            className="rounded-[10px] border border-white/[0.28] px-[26px] py-[15px] text-[15px] font-semibold text-white transition-colors hover:border-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-night"
          >
            Crear mi cuenta
          </Link>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.08] bg-abyss text-on-night-soft">
      <div className={`${SHELL} grid gap-10 pb-10 pt-[60px] lg:grid-cols-[1.4fr_1fr_1fr_1fr]`}>
        <div>
          <Logo tone="light" className="h-[30px]" alt="MediConnect" />
          <p className="mt-3 max-w-[340px] text-sm leading-[1.7]">
            Consultas por video con profesionales verificados e historia clínica digital que te
            pertenece.
          </p>
        </div>

        {FOOTER_COLUMNS.map((col) => (
          <div key={col.titulo} className="grid content-start gap-[9px] text-sm font-medium">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-footer-label">
              {col.titulo}
            </span>
            {col.items.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        ))}
      </div>

      <div
        className={`${SHELL} border-t border-white/[0.08] pb-10 pt-5 text-[11px] font-semibold tracking-[0.06em] text-footer-label`}
      >
        © 2026 MEDICONNECT · MediConnect no reemplaza una urgencia médica. Ante una emergencia
        llamá al 107.
      </div>
    </footer>
  );
}
