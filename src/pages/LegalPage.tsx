import type { ReactNode } from 'react';
import { LEGAL_VERSION_LABEL } from '../features/legal/legal';
import { PUBLIC_SHELL, PublicHeader } from '../shared/ui/PublicHeader';

/**
 * Términos y condiciones, política de privacidad y consentimiento para el
 * tratamiento de datos de salud (ENG-140).
 *
 * Pública y sin sesión: se tiene que poder leer **antes** de crear la cuenta, y
 * los enlaces del registro la abren en otra pestaña.
 *
 * ⚠️ Si cambia el contenido, hay que subir `LEGAL_VERSION` acá y en el backend:
 * es lo que hace que a quien ya aceptó se le vuelvan a pedir los textos nuevos.
 */
export function LegalPage() {
  return (
    <div className="min-h-svh bg-surface">
      <PublicHeader />

      <main className={`${PUBLIC_SHELL} pb-[88px] pt-10`}>
        <div className="max-w-[720px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Legales · versión del {LEGAL_VERSION_LABEL}
          </p>
          <h1 className="font-display mt-2.5 text-[32px] leading-[1.1] text-brand-deep lg:text-[40px]">
            Términos, privacidad y consentimiento
          </h1>
          <p className="mt-4 rounded-[10px] border border-brand/30 bg-surface-teal px-4 py-3 text-[13px] leading-[1.7] text-brand-deep">
            MediConnect es el proyecto final de un grupo de estudiantes de Ingeniería en Sistemas de
            la UTN, Facultad Regional Córdoba. Estos textos describen cómo funcionaría el servicio y
            cómo trata tus datos; no reemplazan el asesoramiento legal que necesitaría una puesta en
            producción comercial.
          </p>

          <nav aria-label="Secciones" className="mt-6">
            <ol className="flex flex-wrap gap-2 text-[13px] font-semibold">
              <Indice href="#terminos">Términos y condiciones</Indice>
              <Indice href="#privacidad">Política de privacidad</Indice>
              <Indice href="#consentimiento">Consentimiento de datos de salud</Indice>
            </ol>
          </nav>

          <Seccion id="terminos" titulo="Términos y condiciones">
            <Subtitulo>Qué es MediConnect</Subtitulo>
            <p>
              MediConnect es una plataforma que conecta pacientes con profesionales de la salud para
              reservar turnos, hacer videoconsultas y llevar la historia clínica en un solo lugar.
              MediConnect no presta servicios médicos: la atención la brinda cada profesional, bajo
              su responsabilidad y su matrícula.
            </p>

            <Subtitulo>No es para urgencias</Subtitulo>
            <p>
              La videoconsulta no reemplaza la atención presencial ni de emergencia. Ante una
              urgencia, llamá al 107 o acercate a la guardia más cercana.
            </p>

            <Subtitulo>Tu cuenta</Subtitulo>
            <p>
              Sos responsable de que los datos que cargás sean ciertos y de mantener tu contraseña
              en secreto. Para registrarte tenés que ser mayor de 18 años.
            </p>

            <Subtitulo>Profesionales</Subtitulo>
            <p>
              Solo aparecen en el catálogo los profesionales cuya matrícula verificamos. Cada uno
              define su precio, su agenda y su política de cancelación, que se muestran antes de
              reservar.
            </p>

            <Subtitulo>Pagos</Subtitulo>
            <p>
              Las consultas se pagan con MercadoPago. MediConnect no ve ni guarda los datos de tu
              tarjeta: se cargan del lado de MercadoPago. Un turno queda confirmado cuando
              MercadoPago nos avisa que el pago se acreditó.
            </p>

            <Subtitulo>Cambios</Subtitulo>
            <p>
              Si cambiamos estos textos, te vamos a pedir que los vuelvas a aceptar antes de seguir
              usando la app.
            </p>
          </Seccion>

          <Seccion id="privacidad" titulo="Política de privacidad">
            <Subtitulo>Qué datos guardamos</Subtitulo>
            <ul>
              <li>De tu cuenta: email, nombre, apellido y rol (paciente o profesional).</li>
              <li>De tus turnos: fecha, profesional, estado y pago.</li>
              <li>
                De tu salud: la historia clínica que escriben los profesionales que te atienden, y
                los datos de tu MediPass (alergias, condiciones, medicación, grupo sanguíneo y
                contacto de emergencia).
              </li>
              <li>Quién accedió a tu historia clínica y a tu MediPass, y cuándo.</li>
            </ul>

            <Subtitulo>Para qué los usamos</Subtitulo>
            <p>
              Solo para darte el servicio: gestionar tus turnos y pagos, que tus profesionales vean
              tu historia clínica y que puedas compartir tu MediPass cuando lo decidas. No los
              vendemos ni los usamos para publicidad.
            </p>

            <Subtitulo>Quién puede verlos</Subtitulo>
            <ul>
              <li>Vos, siempre.</li>
              <li>Los profesionales con los que tuviste o tenés un turno, solo para atenderte.</li>
              <li>
                Quien escanee tu MediPass, solo con el código que vos generás, por un tiempo
                limitado y dejando registro del acceso. Podés cortar el acceso cuando quieras.
              </li>
              <li>
                Los proveedores que hacen funcionar la plataforma (alojamiento y base de datos,
                videollamadas y pagos), solo en lo necesario para prestar el servicio.
              </li>
            </ul>

            <Subtitulo>Cómo los protegemos</Subtitulo>
            <p>
              Las conexiones van cifradas, cada usuario accede solo a lo que le corresponde, y la
              historia clínica no se puede modificar ni borrar: una corrección es una entrada nueva
              que queda a la vista. Cada acceso a tu historia clínica queda registrado.
            </p>

            <Subtitulo>Cuánto tiempo</Subtitulo>
            <p>
              La historia clínica se conserva durante al menos 10 años desde la última atención,
              como exige la Ley 26.529 (art. 18), aunque cierres tu cuenta. El resto de los datos se
              conserva mientras tengas la cuenta activa.
            </p>

            <Subtitulo>Tus derechos</Subtitulo>
            <p>
              Por la Ley 25.326 podés pedir acceso a tus datos, rectificarlos, actualizarlos o
              suprimirlos, salvo la historia clínica, que se tiene que conservar. Tenemos 10 días
              corridos para responder un pedido de acceso y 5 días hábiles para una rectificación o
              supresión. La historia clínica es tuya (Ley 26.529, art. 14): podés pedir una copia en
              cualquier momento.
            </p>
            <p>
              La Agencia de Acceso a la Información Pública, en su carácter de órgano de control de
              la Ley 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan
              quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes
              en materia de protección de datos personales.
            </p>
          </Seccion>

          <Seccion
            id="consentimiento"
            titulo="Consentimiento para el tratamiento de datos de salud"
          >
            <p>
              Los datos de salud son datos sensibles (Ley 25.326, arts. 2 y 7), y para tratarlos
              necesitamos tu consentimiento expreso. Al aceptar:
            </p>
            <ul>
              <li>
                Prestás tu consentimiento libre, expreso e informado para que MediConnect guarde y
                trate tus datos de salud con las finalidades de esta política.
              </li>
              <li>
                Autorizás a los profesionales que te atiendan por la plataforma a ver tu historia
                clínica y a agregar entradas.
              </li>
              <li>
                Entendés que compartir tu MediPass es decisión tuya en cada caso, y que podés
                revocar un acceso en cualquier momento.
              </li>
            </ul>
            <p>
              Si en algún momento grabamos o transcribimos una videoconsulta, te lo vamos a pedir
              aparte, antes de empezar. Podés retirar este consentimiento cuando quieras cerrando tu
              cuenta; eso no borra la historia clínica, que se conserva por el plazo legal.
            </p>
          </Seccion>
        </div>
      </main>
    </div>
  );
}

function Indice({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <a
        href={href}
        className="inline-block rounded-full border border-line bg-white px-3.5 py-1.5 text-brand-deep hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {children}
      </a>
    </li>
  );
}

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className="mt-10 scroll-mt-24 border-t border-line pt-8"
    >
      <h2
        id={`${id}-titulo`}
        className="font-display text-[26px] leading-[1.2] text-brand-deep [text-wrap:balance]"
      >
        {titulo}
      </h2>
      <div className="mt-4 grid gap-3 text-[15px] leading-[1.7] text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:grid [&_ul]:gap-1.5">
        {children}
      </div>
    </section>
  );
}

function Subtitulo({ children }: { children: ReactNode }) {
  return <h3 className="mt-3 text-[15px] font-bold text-brand-deep">{children}</h3>;
}
