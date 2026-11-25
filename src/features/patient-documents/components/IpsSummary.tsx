import { useState, type ReactNode } from 'react';
import { SideDrawer } from '../../../shared/ui/SideDrawer';
import { IpsMediPass } from '../../patient-profile/components/IpsMediPass';
import { useMyProfile } from '../../patient-profile/hooks/usePatientProfile';
import {
  cantidadDeItems,
  fechaDelDocumento,
  yaEnMediPass,
  type IpsResumen,
} from '../../patient-profile/lib/ipsImport';
import { useIpsSummary, useOpenDocument } from '../hooks/usePatientDocuments';

/**
 * El resumen de salud IPS de un documento, ordenado (ENG-246, ADR-022), en un
 * panel lateral: problemas, alergias, medicación y vacunas.
 *
 * Lo ven el paciente y los profesionales que pueden leer su historia, igual que
 * el resto de lo que aporta el paciente: aparte de lo firmado y marcado como no
 * validado. Al paciente, además, se le ofrece sumar lo que trae a su MediPass.
 */
export function IpsSummaryDrawer({
  documentId,
  paraPaciente,
  onClose,
}: {
  /** `null`: cerrado. */
  documentId: string | null;
  /** Si lo mira el propio paciente: puede sumarlo a su MediPass. */
  paraPaciente: boolean;
  onClose: () => void;
}) {
  return (
    <SideDrawer open={documentId !== null} title="Resumen de salud" onClose={onClose}>
      {documentId && (
        <IpsSummary key={documentId} documentId={documentId} paraPaciente={paraPaciente} />
      )}
    </SideDrawer>
  );
}

function IpsSummary({ documentId, paraPaciente }: { documentId: string; paraPaciente: boolean }) {
  const resumen = useIpsSummary(documentId);
  const abrir = useOpenDocument();
  const [sumando, setSumando] = useState(false);
  const [sumado, setSumado] = useState(false);

  if (resumen.isPending) {
    return (
      <p role="status" className="text-[13px] text-muted">
        Cargando el resumen…
      </p>
    );
  }
  if (resumen.isError) {
    return (
      <div role="alert" className="grid gap-3">
        <p className="text-[13px] text-danger">{resumen.error.message}</p>
        <button
          type="button"
          onClick={() => void resumen.refetch()}
          className="justify-self-start rounded-full border border-line-strong px-3.5 py-1.5 text-[13px] font-semibold text-brand-deep hover:border-brand hover:bg-surface-teal"
        >
          Probá de nuevo
        </button>
      </div>
    );
  }

  const datos = resumen.data;
  if (sumando) {
    return (
      <IpsMediPass
        resumen={datos}
        onCancel={() => setSumando(false)}
        onDone={() => {
          setSumando(false);
          setSumado(true);
        }}
      />
    );
  }

  const { allergies, medications, conditions } = datos.propuesta;
  const fecha = fechaDelDocumento(datos.documento.fecha);
  const vacio =
    allergies.length + medications.length + conditions.length + datos.vacunas.length === 0;

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="grid gap-2 px-1">
        <p className="text-[15px] font-semibold text-brand-deep">
          {datos.documento.titulo ?? 'Resumen de salud'}
        </p>
        {fecha && <p className="text-[13px] text-muted">Del {fecha}</p>}
        <p className="text-[12.5px] leading-[1.6] text-muted">
          <span className="mr-1.5 inline-block rounded-full bg-tag-warm px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-tag-warm-ink">
            No validado
          </span>
          {paraPaciente
            ? 'Lo aportaste vos desde otro centro de salud. Lo ven los profesionales que te atienden, aparte de tu historia firmada.'
            : 'Lo aportó el paciente desde otro centro de salud. No forma parte de la historia firmada.'}
        </p>
      </div>

      {sumado && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-[10px] bg-surface-teal px-4 py-2.5 text-[13px] font-semibold text-brand-hover"
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
          Listo: ya se ve en tu MediPass.
        </p>
      )}

      {vacio ? (
        <p className="rounded-[14px] border border-line bg-white p-4 text-[13px] text-muted">
          Este resumen no trae problemas, alergias, medicación ni vacunas.
        </p>
      ) : (
        <div className="grid gap-4 rounded-[14px] border border-line bg-white p-4">
          <Seccion titulo="Problemas y condiciones">
            {conditions.map((c) => (
              <Item key={c.nombre} texto={c.nombre} detalle={c.codigo} />
            ))}
          </Seccion>
          <Seccion titulo="Alergias">
            {allergies.map((a) => (
              <Item key={a.que} texto={a.que} detalle={a.gravedad} alerta />
            ))}
          </Seccion>
          <Seccion titulo="Medicación">
            {medications.map((m) => (
              <Item key={m.droga} texto={m.droga} detalle={m.dosis} />
            ))}
          </Seccion>
          <Seccion titulo="Vacunas">
            {datos.vacunas.map((v) => (
              <Item
                key={`${v.vacuna}-${v.fecha ?? ''}`}
                texto={v.vacuna}
                detalle={fechaDelDocumento(v.fecha) ?? v.fecha ?? undefined}
              />
            ))}
          </Seccion>
        </div>
      )}

      {datos.ignorados.length > 0 && (
        <p className="px-1 text-[12px] leading-[1.6] text-muted">
          Hay partes del resumen que MediConnect todavía no muestra. Están en el archivo original.
        </p>
      )}

      {abrir.isError && (
        <p role="alert" className="px-1 text-[13px] text-danger">
          {abrir.error.message}
        </p>
      )}

      <footer className="sticky bottom-0 -mx-4 -mb-4 mt-auto flex flex-wrap items-center justify-end gap-3 border-t border-line bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => abrir.mutate(documentId)}
          className="rounded-[9px] px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-line-soft hover:text-brand-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Abrir el archivo original
        </button>
        {paraPaciente && (
          <SumarAlMediPass
            resumen={datos}
            onSumar={() => {
              setSumado(false);
              setSumando(true);
            }}
          />
        )}
      </footer>
    </div>
  );
}

/**
 * El botón para sumar al MediPass, solo para el paciente: si todo lo que trae el
 * resumen ya está en su MediPass, lo dice en lugar de ofrecer sumarlo de nuevo.
 * Va aparte porque lee el perfil del paciente, que el profesional no puede pedir.
 */
function SumarAlMediPass({ resumen, onSumar }: { resumen: IpsResumen; onSumar: () => void }) {
  const perfil = useMyProfile();
  const total = cantidadDeItems(resumen);
  if (total === 0) return null;
  if (perfil.data && yaEnMediPass(perfil.data, resumen).size === total) {
    return (
      <p role="status" className="px-2 text-[13px] font-semibold text-brand-hover">
        Ya está todo en tu MediPass.
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={onSumar}
      className="rounded-[9px] bg-brand-deep px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
    >
      Sumar a mi MediPass
    </button>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode[] }) {
  return (
    <section className="grid gap-1.5">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{titulo}</h3>
      {children.length > 0 ? (
        <ul className="grid gap-1">{children}</ul>
      ) : (
        <p className="text-[13px] text-muted-soft">No trae.</p>
      )}
    </section>
  );
}

function Item({ texto, detalle, alerta }: { texto: string; detalle?: string; alerta?: boolean }) {
  return (
    <li className={`text-[14px] ${alerta ? 'font-semibold text-danger' : 'text-ink'}`}>
      {texto}
      {detalle && <span className="font-normal text-muted"> · {detalle}</span>}
    </li>
  );
}
