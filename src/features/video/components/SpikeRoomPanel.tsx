import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../../shared/ui/Button';
import { createSpikeRoom, deleteSpikeRoom, getSpikeSessions } from '../api/videoApi';
import type { MeetingSession, SpikeRoom } from '../types/dailyRoom';
import { DailyPrebuiltFrame } from './DailyPrebuiltFrame';

/**
 * Banco de pruebas del spike de Daily (ENG-51): crear la sala, entrar, medir y
 * limpiar, todo desde una pantalla.
 *
 * Existe para que la medición del criterio 3 sea **repetible**: cualquiera del
 * equipo puede rehacer la prueba de 30 minutos sin tocar curl ni el dashboard de
 * Daily, y obtener los mismos números. No es una pantalla de producto — la
 * videoconsulta de verdad es ENG-56 y arranca desde un turno confirmado.
 */
export function SpikeRoomPanel() {
  const [room, setRoom] = useState<SpikeRoom | null>(null);
  const [sessions, setSessions] = useState<MeetingSession[] | null>(null);

  const create = useMutation({
    mutationFn: createSpikeRoom,
    onSuccess: (created) => {
      setRoom(created);
      setSessions(null);
    },
  });

  const measure = useMutation({
    mutationFn: getSpikeSessions,
    onSuccess: setSessions,
  });

  const remove = useMutation({
    mutationFn: deleteSpikeRoom,
    onSuccess: () => {
      setRoom(null);
      setSessions(null);
    },
  });

  const error = create.error ?? measure.error ?? remove.error;

  return (
    <div className="space-y-6">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {error.message}
        </p>
      )}

      {!room && (
        <div className="rounded-[14px] border border-line bg-white p-5">
          <p className="text-sm text-muted">
            Se crea una sala privada que expira sola a los 40 minutos y admite como máximo 2
            participantes. El backend firma un meeting token por rol: con la URL sola no se entra.
          </p>
          <Button className="mt-4" onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? 'Creando sala…' : 'Crear sala de prueba'}
          </Button>
        </div>
      )}

      {room && (
        <>
          <div className="rounded-[14px] border border-line bg-white p-5">
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted">Sala</dt>
                <dd className="font-medium text-ink">{room.name}</dd>
              </div>
              <div>
                <dt className="text-muted">Expira</dt>
                <dd className="font-medium text-ink">
                  {new Date(room.expiresAt).toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Participantes máx.</dt>
                <dd className="font-medium text-ink">{room.maxParticipants}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-3">
              {/* La prueba necesita DOS participantes. Este link abre la misma
                  sala con el token del paciente en otra pestaña o en otra
                  máquina, que es como se mide la llamada de verdad. */}
              <a
                href={room.patientUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand px-5 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/5"
              >
                Entrar como paciente (otra pestaña)
              </a>
              <Button
                variant="secondary"
                onClick={() => measure.mutate(room.name)}
                disabled={measure.isPending}
              >
                {measure.isPending ? 'Consultando…' : 'Ver métricas de la sesión'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => remove.mutate(room.name)}
                disabled={remove.isPending}
              >
                {remove.isPending ? 'Borrando…' : 'Borrar sala'}
              </Button>
            </div>
          </div>

          <DailyPrebuiltFrame
            roomUrl={room.professionalUrl}
            title="Sala de prueba de Daily (rol profesional)"
          />

          {sessions && <SessionsTable sessions={sessions} />}
        </>
      )}
    </div>
  );
}

/** Métricas que devuelve Daily una vez terminada la sesión. */
function SessionsTable({ sessions }: { sessions: MeetingSession[] }) {
  if (sessions.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
        Todavía no hay sesiones cerradas. Daily publica los datos recién cuando la llamada termina:
        salí de la sala y volvé a consultar.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
      <table className="w-full text-sm">
        <caption className="px-4 pt-4 text-left font-semibold text-ink">
          Sesiones registradas por Daily
        </caption>
        <thead className="text-left text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Inicio</th>
            <th className="px-4 py-2 font-medium">Duración</th>
            <th className="px-4 py-2 font-medium">Participantes</th>
            <th className="px-4 py-2 font-medium">Min. de participante</th>
          </tr>
        </thead>
        <tbody className="text-ink">
          {sessions.map((session) => (
            <tr key={session.id} className="border-t border-line-soft">
              <td className="px-4 py-2">{new Date(session.startTime).toLocaleString('es-AR')}</td>
              <td className="px-4 py-2">{Math.round(session.durationSeconds / 60)} min</td>
              <td className="px-4 py-2">{session.participants}</td>
              <td className="px-4 py-2">{session.participantMinutes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
