import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useMyAppointments } from '../../features/appointments/hooks/useAppointments';
import { useLogout, useSession } from '../../features/auth/hooks/useSession';
import { nextAppointment } from '../../features/dashboard/lib/dashboard';
import { firstJoinable } from '../../features/video/lib/joinWindow';
import { useNow } from '../hooks/useNow';
import { ConfirmDialog } from './ConfirmDialog';
import { Logo } from './Logo';
import {
  IconAgenda,
  IconBuscar,
  IconHistoria,
  IconMediPass,
  IconModeracion,
  IconPanel,
  IconPerfil,
  IconTurnos,
  IconVideo,
} from './NavIcons';

/**
 * Marco de las pantallas privadas: barra lateral oscura fija y barra superior
 * pegada con el título de la pantalla.
 *
 * Reemplaza al header horizontal que había. El cambio no es estético: con
 * navegación lateral el usuario ve **dónde está y a dónde puede ir** sin abrir
 * nada, que es justo lo que un panel con cuatro o cinco secciones necesita.
 *
 * **Los ítems del menú salen de las rutas que existen de verdad, y del rol que
 * puede entrar en ellas.** El canvas lista además MediPass, Gestión de accesos y
 * QR de emergencia, que ya están: un menú que lleva a la nada es peor que un menú
 * corto — y uno que lleva a un 403 es peor todavía.
 *
 * La videoconsulta es la excepción y va aparte: su ruta necesita un turno
 * (`/turnos/:id/videoconsulta`), así que no puede ser un enlace fijo. Está en los
 * dos menús —paciente y profesional— y apunta a la consulta que esté abierta, o
 * si no a la próxima, cuya sala de espera dice cuánto falta. Sin ningún turno por
 * delante queda apagada, en vez de llevar a ningún lado.
 *
 * En pantalla chica la barra lateral pasa a ser una fila de pestañas arriba del
 * contenido: apilar seis ítems a lo alto empujaría la pantalla entera fuera de
 * vista.
 *
 * **En pantalla ancha la barra vive plegada** —72 px, solo el corazón del logo y
 * los iconos— y se abre sola al pasarle el mouse por encima. Recupera unos 160 px
 * de ancho para el contenido, que en la agenda y en la ficha es justo lo que
 * faltaba.
 *
 * Tres decisiones que hacen que no moleste:
 *
 * - **Al abrirse no empuja nada.** La columna de la grilla mide siempre 72 px y
 *   el panel abierto se dibuja ENCIMA del contenido. Si la columna creciera, cada
 *   vez que el mouse rozara el borde izquierdo se reacomodaría la pantalla entera.
 * - **También se abre con el teclado** (`focus-within`). Sin eso, quien navega
 *   con Tab recorrería una columna de iconos sin saber en cuál está.
 * - **Las etiquetas nunca se sacan del DOM.** Se ocultan con opacidad y ancho, no
 *   con `hidden`: el nombre accesible del enlace tiene que seguir siendo "Mis
 *   turnos" aunque en pantalla se vea un icono, o el menú plegado queda mudo.
 */

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  Icon: (props: { className?: string }) => React.ReactElement;
};

/**
 * El menú va en dos bloques separados por un filete, y el orden dentro de cada
 * uno no es alfabético ni el del canvas: es el del recorrido real.
 *
 * Arriba, **lo que se hace**: el panel, buscar a quién consultar, los turnos que
 * salen de eso y la consulta en curso. Abajo, **lo que es tuyo**: la historia, el
 * MediPass y los datos de la cuenta. Antes "Buscar profesionales" caía quinto,
 * después de la historia clínica y el MediPass, cuando es la acción que arranca
 * todo lo demás.
 *
 * El separador funciona plegada, que es lo que un rótulo de sección no haría: al
 * ocultarse el texto quedaría un hueco sin explicación.
 */
const NAV_PACIENTE: NavItem[][] = [
  [
    { to: '/paciente', label: 'Panel', end: true, Icon: IconPanel },
    { to: '/buscar', label: 'Buscar profesionales', Icon: IconBuscar },
    { to: '/mis-turnos', label: 'Mis turnos', Icon: IconTurnos },
  ],
  [
    { to: '/historia', label: 'Mi historia clínica', Icon: IconHistoria },
    { to: '/medipass', label: 'MediPass', Icon: IconMediPass },
    { to: '/perfil/paciente', label: 'Mi perfil', Icon: IconPerfil },
  ],
];

const NAV_PROFESIONAL: NavItem[][] = [
  [
    { to: '/profesional', label: 'Panel', end: true, Icon: IconPanel },
    { to: '/profesional/agenda', label: 'Mi agenda', Icon: IconAgenda },
    { to: '/mis-turnos', label: 'Mis consultas', Icon: IconTurnos },
  ],
  [{ to: '/perfil', label: 'Mi perfil público', Icon: IconPerfil }],
];

/**
 * El moderador tiene una sola pantalla propia, y el catálogo, que es público y le
 * sirve para ver el perfil sobre el que está moderando una reseña. Son dos ítems,
 * pero los dos andan: antes veía los cinco del paciente y cuatro le daban 403.
 */
const NAV_MODERADOR: NavItem[][] = [
  [
    { to: '/moderacion', label: 'Moderación', end: true, Icon: IconModeracion },
    { to: '/buscar', label: 'Buscar profesionales', Icon: IconBuscar },
  ],
];

const NAV_POR_ROL: Record<string, NavItem[][]> = {
  PACIENTE: NAV_PACIENTE,
  PROFESIONAL: NAV_PROFESIONAL,
  MODERADOR: NAV_MODERADOR,
};

const ROL_VISIBLE: Record<string, string> = {
  PACIENTE: 'Paciente',
  PROFESIONAL: 'Profesional',
  MODERADOR: 'Moderador',
};

/**
 * Fila de un ítem del menú.
 *
 * Plegada, el icono va centrado en la columna; abierta, a la izquierda con su
 * etiqueta. El `gap` también se apaga al plegarse, y eso no es cosmético: aunque
 * la etiqueta mida cero, el hueco entre ella y el icono sigue ocupando sus 12 px,
 * y con eso el ítem medía 58 en una columna de 48 — desbordaba, y los iconos
 * quedaban descentrados respecto del logo y del avatar.
 */
const ITEM =
  'flex items-center gap-3 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright lg:justify-center lg:gap-0 lg:px-0 lg:group-hover/rail:justify-start lg:group-hover/rail:gap-3 lg:group-hover/rail:px-[13px] lg:group-focus-within/rail:justify-start lg:group-focus-within/rail:gap-3 lg:group-focus-within/rail:px-[13px]';

/**
 * Etiqueta que aparece al abrirse la barra.
 *
 * Se oculta con `opacity` y `w-0`, NO con `hidden`: el texto tiene que seguir en
 * el árbol de accesibilidad para que el enlace se anuncie por su nombre aunque en
 * pantalla solo se vea el icono. Con `hidden` el menú plegado quedaría mudo.
 */
const ETIQUETA =
  'overflow-hidden transition-[opacity,width] duration-200 motion-reduce:transition-none lg:w-0 lg:opacity-0 lg:group-hover/rail:w-auto lg:group-hover/rail:opacity-100 lg:group-focus-within/rail:w-auto lg:group-focus-within/rail:opacity-100';

/**
 * Botón de cerrar sesión.
 *
 * Plegada es un cuadrado del ancho de un icono, centrado como el avatar de
 * arriba: a ancho completo quedaba una caja con borde de 48 px sola en la
 * columna, que no se parecía a nada más de la barra. Al abrirse recupera el ancho
 * completo y su etiqueta.
 */
const SALIR =
  'flex items-center justify-center gap-2 rounded-lg border border-white/[0.18] py-2.5 text-xs font-semibold text-on-night-soft transition-colors hover:border-brand-bright hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright disabled:opacity-60 lg:mx-auto lg:h-[34px] lg:w-[34px] lg:py-0 lg:group-hover/rail:mx-0 lg:group-hover/rail:h-auto lg:group-hover/rail:w-full lg:group-hover/rail:py-2.5 lg:group-focus-within/rail:mx-0 lg:group-focus-within/rail:h-auto lg:group-focus-within/rail:w-full lg:group-focus-within/rail:py-2.5';

/** Salir. Va acá y no en `NavIcons` porque no es un ítem de navegación. */
function IconSalir() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4 flex-none"
    >
      <path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" />
      <path d="m16 16 4-4-4-4M20 12H9" />
    </svg>
  );
}

/**
 * Ancho del área de contenido.
 *
 * `mx-auto` es la diferencia con lo que había: el contenido estaba topeado en
 * 1220 px pero **pegado a la izquierda**, así que en un monitor de 24\" quedaba
 * medio metro de blanco a la derecha y nada a la izquierda. Las páginas públicas
 * ya se centraban —por eso la landing se veía bien y la app no—; esto usa el
 * mismo criterio.
 *
 * El tope es más ancho que el de las públicas (1240) a propósito: aquellas son
 * para leer, y una columna de texto muy larga cansa. Estas son para operar —
 * grillas de tarjetas, tablas, calendarios— y ahí el ancho se aprovecha.
 */
const CONTENIDO = 'mx-auto w-full max-w-[1440px] px-6 lg:px-9';

type AppShellProps = {
  /** Título de la barra superior. */
  title: string;
  children: ReactNode;
};

export function AppShell({ title, children }: AppShellProps) {
  const { user } = useSession();
  const { mutate: logout, isPending } = useLogout();
  /** Cerrar sesión pide confirmación: es un click de un solo paso que corta el
   *  trabajo en curso, y en un turno o una consulta abierta eso duele. */
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);

  const esModerador = user?.role === 'MODERADOR';

  /**
   * Si tiene sentido pedirle los turnos a este usuario.
   *
   * Se exige que la sesión ya haya resuelto (`user` no nulo) y no solo que el rol
   * no sea MODERADOR: mientras carga, `user` es nulo y `esModerador` da false, así
   * que el moderador igual disparaba el request en el primer render — que es
   * justamente lo que se quiere evitar.
   */
  const tieneTurnos = user != null && !esModerador;

  // La consulta a la que se puede entrar ahora. Comparte queryKey con "Mis
  // turnos", así que estar en el menú de todas las pantallas privadas no agrega
  // un request por pantalla.
  const appointments = useMyAppointments(tieneTurnos);
  const now = useNow();
  const turnos = appointments.data ?? [];
  // La abierta manda; si no hay, la próxima, que lleva a la sala de espera.
  const enCurso = firstJoinable(turnos, now);
  const proxima = enCurso ?? nextAppointment(turnos, now);

  // Mapa explícito y no un ternario: con `PROFESIONAL ? … : PACIENTE`, el
  // MODERADOR caía en el menú del paciente y cuatro de sus cinco ítems le
  // devolvían 403. Mientras la sesión no cargó se cae al de paciente, que es el
  // rol más común; el guard de la ruta es RequireAuth, no esto.
  const grupos = NAV_POR_ROL[user?.role ?? ''] ?? NAV_PACIENTE;
  const nombre = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : (user?.email ?? '');
  const iniciales =
    (user?.firstName?.charAt(0) ?? '') + (user?.lastName?.charAt(0) ?? '') || '·';
  const rol = ROL_VISIBLE[user?.role ?? ''] ?? 'Paciente';

  return (
    /* La primera columna es `auto`: mide lo que mide la barra, así que al abrirse
       el contenido se corre en vez de quedar tapado. */
    <div className="min-h-svh bg-surface lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
      {/* `group` para que los hijos reaccionen al hover de la barra entera, y no
          cada uno al suyo. */}
      <aside className="group/rail bg-night px-4 py-6 transition-[width] duration-200 ease-out motion-reduce:transition-none lg:sticky lg:top-0 lg:grid lg:h-svh lg:w-[72px] lg:grid-rows-[auto_auto_1fr] lg:gap-6 lg:overflow-hidden lg:px-3 lg:hover:w-[268px] lg:focus-within:w-[268px]">
        {/* Plegada, el isotipo se centra en la columna igual que los iconos; al
            abrirse, el lockup se alinea a la izquierda con el resto. */}
        <Link
          to="/"
          className="flex items-center px-2 lg:h-[26px] lg:justify-center lg:px-0 lg:group-hover/rail:justify-start lg:group-hover/rail:px-[13px] lg:group-focus-within/rail:justify-start lg:group-focus-within/rail:px-[13px]"
          aria-label="MediConnect — inicio"
        >
          {/* Plegada se ve el corazón; abierta, el logo entero. Son dos imágenes
              del mismo original, así que la transición no cambia de marca. */}
          <Logo variant="mark" className="hidden h-[26px] lg:block lg:group-hover/rail:hidden lg:group-focus-within/rail:hidden" />
          {/* El lockup va un punto más bajo que el isotipo: mide 7,8 veces su
              alto, así que a 26 px se comía casi todo el ancho de la barra
              abierta y quedaba pegado al borde. */}
          <Logo
            tone="light"
            className="h-[23px] max-w-none lg:hidden lg:group-hover/rail:block lg:group-focus-within/rail:block"
          />
        </Link>

        <nav className="mt-6 flex gap-1 overflow-x-auto lg:mt-0 lg:grid lg:content-start lg:gap-4 lg:overflow-visible">
          {grupos.map((grupo, i) => (
            <div
              key={i}
              className={`flex gap-1 lg:grid lg:gap-[3px] ${
                // El filete separa los dos bloques y se ve igual plegada, que es
                // lo que un rótulo de sección no lograría.
                i > 0 ? 'lg:border-t lg:border-white/10 lg:pt-4' : ''
              }`}
            >
              {grupo.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `${ITEM} ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-on-night hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <item.Icon />
                  <span className={ETIQUETA}>{item.label}</span>
                </NavLink>
              ))}

              {/* La videoconsulta cierra el primer bloque: es lo que sigue a un
                  turno, no una sección aparte. El moderador no la tiene — no
                  atiende ni se atiende, y apagada le diría "cuando tengas un
                  turno agendado", que nunca pasa. */}
              {i === 0 && !esModerador && (
                <VideoconsultaLink
                  appointmentId={proxima?.id ?? null}
                  enVivo={enCurso !== null}
                />
              )}
            </div>
          ))}
        </nav>

        {/* `self-end` sobre la tercera fila, que es la que se lleva el espacio
            sobrante: la sesión y el botón de salir quedan al pie de la barra y no
            pegados al último ítem del menú. */}
        <div className="mt-6 grid gap-3.5 border-t border-white/10 pt-4 lg:mt-0 lg:self-end lg:pt-[18px]">
          <div className="flex items-center gap-2.5 px-1.5 lg:justify-center lg:gap-0 lg:px-0 lg:group-hover/rail:justify-start lg:group-hover/rail:gap-2.5 lg:group-hover/rail:px-[9px] lg:group-focus-within/rail:justify-start lg:group-focus-within/rail:gap-2.5 lg:group-focus-within/rail:px-[9px]">
            {/* Las iniciales son el ancla de la fila plegada: ocupan lo mismo que
                un icono y ya identifican a quién tiene la sesión abierta. */}
            <span
              aria-hidden="true"
              className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-brand-hover text-xs font-bold text-white"
            >
              {iniciales.toUpperCase()}
            </span>
            <span className={`grid min-w-0 gap-0.5 ${ETIQUETA}`}>
              <span className="truncate text-[13px] font-bold text-white">{nombre}</span>
              <span className="text-[11px] font-medium text-on-night-soft">{rol}</span>
            </span>
          </div>

          {/* Al limpiarse la sesión, RequireAuth redirige solo al login: una
              sola fuente de verdad para la navegación post-logout. */}
          <button
            type="button"
            disabled={isPending}
            onClick={() => setConfirmandoSalida(true)}
            title="Cerrar sesión"
            className={SALIR}
          >
            <IconSalir />
            <span className={ETIQUETA}>{isPending ? 'Saliendo…' : 'Cerrar sesión'}</span>
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="sticky top-0 z-30 flex h-[66px] items-center border-b border-line bg-white">
          {/* El título usa el MISMO contenedor que el contenido: si la barra
              arrancara en el borde y el contenido fuera centrado, en un monitor
              ancho el título quedaría a medio metro de la pantalla que titula. */}
          <div className={CONTENIDO}>
            <h1 className="text-[22px] font-bold text-brand-deep">{title}</h1>
          </div>
        </div>

        <main className="pb-[72px] pt-8">
          <div className={CONTENIDO}>{children}</div>
        </main>
      </div>

      {/* Al limpiarse la sesión, RequireAuth redirige solo al login: una sola
          fuente de verdad para la navegación post-logout. */}
      <ConfirmDialog
        open={confirmandoSalida}
        titulo="¿Cerrás la sesión?"
        confirmar={isPending ? 'Cerrando…' : 'Cerrar sesión'}
        cancelar="Seguir acá"
        pendiente={isPending}
        onConfirm={() => logout()}
        onCancel={() => setConfirmandoSalida(false)}
      >
        Vas a salir de tu cuenta. Para volver a entrar necesitás tu email y contraseña.
      </ConfirmDialog>
    </div>
  );
}

/**
 * Acceso a la videoconsulta.
 *
 * Con una consulta abierta se enciende en teal y dice "en vivo"; con una próxima
 * lleva a su sala de espera, que muestra cuánto falta. Sin ningún turno por
 * delante queda apagada: no se esconde, porque que el ítem exista es lo que le
 * cuenta a quien nunca tuvo una que la plataforma atiende por video.
 */
function VideoconsultaLink({
  appointmentId,
  enVivo,
}: {
  appointmentId: string | null;
  enVivo: boolean;
}) {
  if (!appointmentId) {
    return (
      <span
        title="Vas a poder entrar cuando tengas un turno agendado"
        aria-disabled="true"
        className={`${ITEM} cursor-not-allowed text-on-night-soft opacity-50`}
      >
        <IconVideo />
        <span className={ETIQUETA}>Videoconsulta</span>
      </span>
    );
  }

  return (
    <NavLink
      to={`/turnos/${appointmentId}/videoconsulta`}
      className={({ isActive }) =>
        `${ITEM} ${
          enVivo
            ? isActive
              ? 'bg-brand/25 text-white'
              : 'bg-brand/15 text-brand-bright hover:bg-brand/25'
            : isActive
              ? 'bg-white/10 text-white'
              : 'text-on-night hover:bg-white/5 hover:text-white'
        }`
      }
    >
      {/* El punto se ancla AL ICONO y no a la caja del ítem: la caja cambia de
          padding al plegarse y el punto quedaría flotando en otro lado. Plegada
          es lo único que avisa que hay una consulta abierta, porque "en vivo" no
          entra en 72 px. */}
      <span className="relative flex flex-none">
        <IconVideo />
        {enVivo && (
          <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
            <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-brand-bright opacity-75 motion-reduce:animate-none" />
            <span className="inline-flex h-2 w-2 rounded-full border-2 border-night bg-brand-bright" />
          </span>
        )}
      </span>
      <span className={ETIQUETA}>Videoconsulta</span>
      {enVivo && (
        <span
          className={`ml-auto text-[10px] font-bold uppercase tracking-[0.08em] ${ETIQUETA}`}
        >
          En vivo
        </span>
      )}
    </NavLink>
  );
}
