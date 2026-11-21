// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScheduleBlocks } from './ScheduleBlocks';
import type { AffectedAppointment } from '../types/schedule';

/*
 * Bloquear un horario con turnos tomados (ENG-206): antes de bloquear se mira
 * qué turnos pisa; si hay, el profesional los ve y escribe el motivo.
 */

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const TURNO: AffectedAppointment = {
  id: 't1',
  scheduledAt: '2099-09-02T13:00:00.000Z',
  date: '2099-09-02',
  startTime: '10:00',
  durationMinutes: 30,
  status: 'CONFIRMADO',
  paid: true,
  patient: { firstName: 'Julián', lastName: 'Paciente' },
};

/** Mockea el backend y registra los cuerpos de cada POST. */
function backend(affected: AffectedAppointment[], create?: () => Response) {
  const posts: { url: string; body: Record<string, unknown> }[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    if (init?.method === 'POST') {
      posts.push({ url, body: JSON.parse(String(init.body)) });
      if (url.endsWith('/blocks/preview')) return Promise.resolve(jsonResponse({ affected }));
      if (url.endsWith('/blocks')) {
        return Promise.resolve(
          create?.() ??
            jsonResponse(
              {
                id: 'b1',
                blockDate: '2099-09-02',
                startTime: null,
                endTime: null,
                reason: null,
                cancelledAppointments: affected.map((a) => ({ id: a.id, status: 'A_REPROGRAMAR' })),
              },
              201,
            ),
        );
      }
    }
    return Promise.resolve(jsonResponse({}, 404));
  });
  return posts;
}

function renderBlocks() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ScheduleBlocks blocks={[]} />
    </QueryClientProvider>,
  );
}

async function bloquearDiaCompleto(user: ReturnType<typeof userEvent.setup>) {
  const fecha = screen.getByLabelText('Fecha');
  await user.clear(fecha);
  await user.type(fecha, '2099-09-02');
  await user.click(screen.getByRole('button', { name: 'Agregar bloqueo' }));
}

describe('ScheduleBlocks con turnos tomados (ENG-206)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('sin turnos en ese horario, bloquea directo', async () => {
    const posts = backend([]);
    const user = userEvent.setup();
    renderBlocks();

    await bloquearDiaCompleto(user);

    expect(await screen.findByText('Bloqueo agregado.')).toBeInTheDocument();
    expect(posts.map((p) => p.url.split('/schedule')[1])).toEqual(['/blocks/preview', '/blocks']);
    expect(posts[1].body).not.toHaveProperty('cancelAffected');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('con turnos, muestra cuáles son y pide el motivo antes de cancelar', async () => {
    const posts = backend([TURNO, { ...TURNO, id: 't2', startTime: '15:00', paid: false }]);
    const user = userEvent.setup();
    renderBlocks();

    await bloquearDiaCompleto(user);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Ese horario tiene 2 turnos tomados')).toBeInTheDocument();
    const lista = within(dialog).getByRole('list', { name: 'Turnos que se cancelan' });
    expect(within(lista).getAllByRole('listitem')).toHaveLength(2);
    expect(within(lista).getByText('Pagado')).toBeInTheDocument();
    expect(within(lista).getByText('Sin pagar')).toBeInTheDocument();
    expect(within(dialog).getByText(/reembolso del 100 %/)).toBeInTheDocument();
    // Todavía no se creó nada.
    expect(posts).toHaveLength(1);

    // Sin motivo no se manda.
    await user.click(
      within(dialog).getByRole('button', { name: 'Bloquear y cancelar los turnos' }),
    );
    expect(within(dialog).getByText(/al menos 10 caracteres/)).toBeInTheDocument();
    expect(posts).toHaveLength(1);

    await user.type(
      within(dialog).getByLabelText('Motivo para los pacientes'),
      '  Tengo un congreso ese día.  ',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Bloquear y cancelar los turnos' }),
    );

    expect(
      await screen.findByText(
        'Bloqueo agregado. Cancelamos 2 turnos y les avisamos a los pacientes.',
      ),
    ).toBeInTheDocument();
    expect(posts[1].body).toMatchObject({
      blockDate: '2099-09-02',
      cancelAffected: true,
      cancellationReason: 'Tengo un congreso ese día.',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('si el backend rechaza, el error queda en el diálogo', async () => {
    backend([TURNO], () =>
      jsonResponse(
        {
          message:
            'Un turno de ese horario cambió mientras lo bloqueabas. Revisá la lista y probá de nuevo.',
        },
        409,
      ),
    );
    const user = userEvent.setup();
    renderBlocks();

    await bloquearDiaCompleto(user);
    const dialog = await screen.findByRole('dialog');
    await user.type(
      within(dialog).getByLabelText('Motivo para los pacientes'),
      'Tengo un congreso ese día.',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Bloquear y cancelar el turno' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/cambió mientras/);
  });

  it('"Volver" cierra sin bloquear', async () => {
    const posts = backend([TURNO]);
    const user = userEvent.setup();
    renderBlocks();

    await bloquearDiaCompleto(user);
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Volver' }),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(posts).toHaveLength(1);
  });

  it('una franja al revés no llega al backend', async () => {
    const posts = backend([]);
    const user = userEvent.setup();
    renderBlocks();

    await user.type(screen.getByLabelText('Fecha'), '2099-09-02');
    await user.selectOptions(screen.getByLabelText('Desde'), '16:00');
    await user.selectOptions(screen.getByLabelText('Hasta'), '14:00');
    await user.click(screen.getByRole('button', { name: 'Agregar bloqueo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/posterior a la de inicio/);
    expect(posts).toHaveLength(0);
  });
});
