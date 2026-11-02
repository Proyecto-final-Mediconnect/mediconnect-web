// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { AppointmentReview } from './AppointmentReview';
import { ModerationQueue } from './ModerationQueue';
import { ProfessionalReviews } from './ProfessionalReviews';
import { ratingLabel } from '../lib/reviews';
import type { ModerationReview, MyReview } from '../types';

/** ENG-80, ENG-81 y ENG-82: dejar, moderar y ver reseñas. */

const TURNO = '44444444-4444-4444-8444-444444444444';
const PRO = '22222222-2222-4222-8222-222222222222';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderWith(ui: ReactElement, responder: (url: string, init?: RequestInit) => Response) {
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation((input, init) => Promise.resolve(responder(String(input), init)));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return fetchMock;
}

const card = (titulo: string, children: ReactNode) => (
  <section>
    <h2>{titulo}</h2>
    {children}
  </section>
);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ratingLabel', () => {
  it('dice el promedio con coma y la cantidad, o que no hay reseñas', () => {
    expect(ratingLabel({ average: 4.7, count: 12 })).toBe('4,7 · 12 reseñas');
    expect(ratingLabel({ average: 5, count: 1 })).toBe('5,0 · 1 reseña');
    expect(ratingLabel(null)).toBe('Sin reseñas todavía');
  });
});

describe('AppointmentReview (ENG-80)', () => {
  it('sin reseña, deja una con estrellas y comentario', async () => {
    let enviada: unknown;
    const fetchMock = renderWith(
      <AppointmentReview appointmentId={TURNO} professionalName="Ana García" />,
      (_url, init) => {
        if (init?.method === 'POST') {
          enviada = JSON.parse(String(init.body));
          return json({ id: 'r1', appointmentId: TURNO, status: 'PENDIENTE_MODERACION' }, 201);
        }
        return json([]);
      },
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Dejar una reseña' }));
    const dialogo = screen.getByRole('dialog', { hidden: true });
    await userEvent.click(
      within(dialogo).getByRole('radio', { name: /4 estrellas/, hidden: true }),
    );
    await userEvent.type(within(dialogo).getByRole('textbox', { hidden: true }), 'Muy clara');
    await userEvent.click(
      within(dialogo).getByRole('button', { name: 'Enviar reseña', hidden: true }),
    );

    await vi.waitFor(() => expect(enviada).toEqual({ rating: 4, comment: 'Muy clara' }));
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(String(post?.[0])).toMatch(new RegExp(`/appointments/${TURNO}/review$`));
  });

  it('sin estrellas no manda nada', async () => {
    const fetchMock = renderWith(
      <AppointmentReview appointmentId={TURNO} professionalName="Ana García" />,
      () => json([]),
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Dejar una reseña' }));
    const dialogo = screen.getByRole('dialog', { hidden: true });
    await userEvent.click(
      within(dialogo).getByRole('button', { name: 'Enviar reseña', hidden: true }),
    );

    expect(within(dialogo).getByText('Elegí de 1 a 5 estrellas.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('con reseña, muestra en qué quedó y el motivo si no se publicó', async () => {
    const rechazada: MyReview = {
      id: 'r1',
      appointmentId: TURNO,
      professionalId: PRO,
      rating: 2,
      comment: 'No me gustó',
      status: 'RECHAZADA',
      moderationReason: 'Tiene datos personales',
      createdAt: '2026-11-01T15:00:00.000Z',
    };
    renderWith(<AppointmentReview appointmentId={TURNO} professionalName="Ana García" />, () =>
      json([rechazada]),
    );

    expect(await screen.findByText('No publicada')).toBeInTheDocument();
    expect(screen.getByText('Motivo: Tiene datos personales')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dejar una reseña' })).not.toBeInTheDocument();
  });
});

describe('ProfessionalReviews (ENG-82)', () => {
  it('muestra el promedio, las reseñas con su autor y la respuesta del profesional', async () => {
    renderWith(<ProfessionalReviews professionalId={PRO} card={card} />, () =>
      json({
        reviews: [
          {
            id: 'r1',
            rating: 5,
            comment: 'Muy clara para explicar.',
            author: 'Julián S.',
            createdAt: '2026-10-20T15:00:00.000Z',
            response: { content: 'Gracias Julián.', createdAt: '2026-10-21T15:00:00.000Z' },
          },
        ],
        rating: { average: 4.5, count: 2 },
        page: 1,
        hasMore: false,
      }),
    );

    expect(await screen.findByText('Muy clara para explicar.')).toBeInTheDocument();
    expect(screen.getByText('4,5')).toBeInTheDocument();
    expect(screen.getByText('Julián S.')).toBeInTheDocument();
    expect(screen.getByText('Gracias Julián.')).toBeInTheDocument();
  });

  it('sin reseñas lo dice', async () => {
    renderWith(<ProfessionalReviews professionalId={PRO} card={card} />, () =>
      json({ reviews: [], rating: null, page: 1, hasMore: false }),
    );

    expect(await screen.findByText('Todavía no tiene reseñas')).toBeInTheDocument();
  });
});

describe('ModerationQueue (ENG-81)', () => {
  const PENDIENTE: ModerationReview = {
    id: '55555555-5555-4555-8555-555555555555',
    rating: 4,
    comment: 'Buena atención, aunque arrancó tarde.',
    status: 'PENDIENTE_MODERACION',
    createdAt: '2026-11-01T15:00:00.000Z',
    patient: 'Marina López',
    professional: { id: PRO, name: 'Ana García' },
    moderationReason: null,
    moderatedAt: null,
  };

  function cola(decisiones: unknown[]) {
    return renderWith(<ModerationQueue />, (_url, init) => {
      if (init?.method === 'PATCH') {
        decisiones.push(JSON.parse(String(init.body)));
        return json({ ...PENDIENTE, status: 'APROBADA' });
      }
      return json({ reviews: [PENDIENTE], page: 1, hasMore: false });
    });
  }

  it('muestra quién reseñó a quién y aprueba', async () => {
    const decisiones: unknown[] = [];
    cola(decisiones);

    expect(await screen.findByText('Buena atención, aunque arrancó tarde.')).toBeInTheDocument();
    expect(screen.getByText('Marina López')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/ya se ve en su perfil/);
    expect(decisiones).toEqual([{ decision: 'APROBADA' }]);
  });

  it('rechazar pide el motivo y lo manda', async () => {
    const decisiones: unknown[] = [];
    cola(decisiones);

    await userEvent.click(await screen.findByRole('button', { name: 'Rechazar' }));
    const dialogo = screen.getByRole('dialog', { hidden: true });
    const enviar = within(dialogo).getByRole('button', { name: 'Rechazar', hidden: true });
    expect(enviar).toBeDisabled();

    await userEvent.type(within(dialogo).getByRole('textbox', { hidden: true }), 'Tiene insultos');
    await userEvent.click(enviar);

    await vi.waitFor(() =>
      expect(decisiones).toEqual([{ decision: 'RECHAZADA', reason: 'Tiene insultos' }]),
    );
  });

  it('sin pendientes lo dice', async () => {
    renderWith(<ModerationQueue />, () => json({ reviews: [], page: 1, hasMore: false }));

    expect(await screen.findByText('No hay reseñas para revisar')).toBeInTheDocument();
  });
});
