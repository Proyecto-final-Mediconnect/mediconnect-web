// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { AppointmentReview } from './AppointmentReview';
import { ModerationQueue } from './ModerationQueue';
import { PendingReviewCards } from './PendingReviewCards';
import { ProfessionalReviews } from './ProfessionalReviews';
import { Stars, StarInput } from './Stars';
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
  const vista = render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  const rerender = (otra: ReactElement) =>
    vista.rerender(<QueryClientProvider client={client}>{otra}</QueryClientProvider>);
  return Object.assign(fetchMock, { rerender });
}

function resena(id: string, comment: string) {
  return {
    id,
    rating: 4,
    comment,
    author: 'Julián S.',
    createdAt: '2026-10-20T15:00:00.000Z',
    response: null,
  };
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

describe('Stars', () => {
  it('un promedio se anuncia con su decimal, no redondeado', () => {
    render(<Stars value={4.5} />);
    expect(screen.getByRole('img')).toHaveAccessibleName('4,5 de 5 estrellas');
  });

  it('una calificación entera se anuncia tal cual', () => {
    render(<Stars value={4} />);
    expect(screen.getByRole('img')).toHaveAccessibleName('4 de 5 estrellas');
  });
});

describe('StarInput', () => {
  function Elegir() {
    const [value, setValue] = useState(0);
    return <StarInput value={value} onChange={setValue} />;
  }

  it('el Tab entra una sola vez y las flechas cambian la calificación, con vuelta', async () => {
    render(<Elegir />);
    await userEvent.tab();
    const primera = screen.getByRole('radio', { name: /^1 estrella/ });
    expect(primera).toHaveFocus();
    expect(screen.getAllByRole('radio').filter((r) => r.tabIndex === 0)).toHaveLength(1);

    await userEvent.keyboard('{ArrowRight}');
    const segunda = screen.getByRole('radio', { name: /^2 estrellas/ });
    expect(segunda).toHaveFocus();
    expect(segunda).toHaveAttribute('aria-checked', 'true');

    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    const quinta = screen.getByRole('radio', { name: /^5 estrellas/ });
    expect(quinta).toHaveFocus();
    expect(quinta).toHaveAttribute('aria-checked', 'true');
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

  it('si no se pueden cargar las reseñas, avisa y deja reintentar', async () => {
    let falla = true;
    renderWith(<AppointmentReview appointmentId={TURNO} professionalName="Ana García" />, () =>
      falla ? json({}, 500) : json([]),
    );

    expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent(
      'No pudimos cargar tus reseñas.',
    );
    falla = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('button', { name: 'Dejar una reseña' })).toBeInTheDocument();
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

  it('si falla "ver más", deja las cargadas, avisa y reintenta la misma página', async () => {
    let falla = true;
    const fetchMock = renderWith(
      <ProfessionalReviews professionalId={PRO} card={card} />,
      (url) => {
        if (url.endsWith('page=1')) {
          return json({
            reviews: [resena('r1', 'Primera')],
            rating: { average: 4, count: 2 },
            page: 1,
            hasMore: true,
          });
        }
        if (falla) return json({}, 500);
        return json({
          reviews: [resena('r2', 'Segunda')],
          rating: { average: 4, count: 2 },
          page: 2,
          hasMore: false,
        });
      },
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Ver más reseñas' }));
    expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent(
      'No pudimos cargar las reseñas.',
    );
    expect(screen.getByText('Primera')).toBeInTheDocument();
    expect(screen.getByText('4,0')).toBeInTheDocument();

    falla = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Segunda')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const paginas = fetchMock.mock.calls.map(([u]) => String(u).split('page=')[1]);
    // El 5xx se reintenta una vez solo; después, el botón vuelve a pedir la 2.
    expect(paginas).toEqual(['1', '2', '2', '2']);
  });

  it('al cambiar de profesional no arrastra las reseñas del anterior', async () => {
    const OTRO = '33333333-3333-4333-8333-333333333333';
    const { rerender } = renderWith(
      <ProfessionalReviews professionalId={PRO} card={card} />,
      (url) =>
        json({
          reviews: [resena('x', url.includes(OTRO) ? 'Del otro' : 'De Ana')],
          rating: { average: 4, count: 1 },
          page: 1,
          hasMore: false,
        }),
    );

    expect(await screen.findByText('De Ana')).toBeInTheDocument();
    rerender(<ProfessionalReviews professionalId={OTRO} card={card} />);
    expect(await screen.findByText('Del otro')).toBeInTheDocument();
    expect(screen.queryByText('De Ana')).not.toBeInTheDocument();
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

  it('al cambiar de pestaña no muestra las pendientes con sus acciones', async () => {
    // Las aprobadas tardan: mientras tanto no puede quedar la pestaña anterior.
    let soltarAprobadas: () => void = () => {};
    const aprobadas = new Promise<Response>((resolve) => {
      soltarAprobadas = () => resolve(json({ reviews: [], page: 1, hasMore: false }));
    });
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
      String(input).includes('APROBADA')
        ? aprobadas
        : Promise.resolve(json({ reviews: [PENDIENTE], page: 1, hasMore: false })),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ModerationQueue />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Aprobadas' }));

    expect(screen.getByText('Cargando reseñas…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument();
    soltarAprobadas();
    expect(await screen.findByText('Todavía no hay reseñas acá')).toBeInTheDocument();
  });

  it('al decidir la última de una página que no es la primera, vuelve a la anterior', async () => {
    let decidida = false;
    renderWith(<ModerationQueue />, (url, init) => {
      if (init?.method === 'PATCH') {
        decidida = true;
        return json({ ...PENDIENTE, id: 'p2', status: 'APROBADA' });
      }
      if (url.endsWith('page=2')) {
        const reviews = decidida ? [] : [{ ...PENDIENTE, id: 'p2', comment: 'De la página 2' }];
        return json({ reviews, page: 2, hasMore: false });
      }
      return json({ reviews: [PENDIENTE], page: 1, hasMore: true });
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Siguientes →' }));
    expect(await screen.findByText('De la página 2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar' }));

    expect(await screen.findByText('Buena atención, aunque arrancó tarde.')).toBeInTheDocument();
    expect(screen.queryByText('No hay reseñas para revisar')).not.toBeInTheDocument();
  });

  it('sin pendientes lo dice', async () => {
    renderWith(<ModerationQueue />, () => json({ reviews: [], page: 1, hasMore: false }));

    expect(await screen.findByText('No hay reseñas para revisar')).toBeInTheDocument();
  });
});

describe('PendingReviewCards (ENG-190)', () => {
  const PENDIENTE = {
    appointmentId: TURNO,
    scheduledAt: '2026-11-20T15:00:00.000Z',
    professional: { id: PRO, firstName: 'Ana', lastName: 'Gómez', photoUrl: null },
  };

  it('sin pendientes no muestra nada', async () => {
    const fetchMock = renderWith(<PendingReviewCards />, () => json([]));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByText(/cómo fue tu consulta/i)).not.toBeInTheDocument();
  });

  it('tocar una estrella abre el formulario con esa calificación', async () => {
    const user = userEvent.setup();
    renderWith(<PendingReviewCards />, () => json([PENDIENTE]));

    expect(await screen.findByText('¿Cómo fue tu consulta con Ana Gómez?')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /4 estrellas/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('radio', { name: /4 estrellas/i })).toBeChecked();
  });

  it('la cruz descarta el pedido y la tarjeta no vuelve', async () => {
    const user = userEvent.setup();
    let pendientes = [PENDIENTE];
    const fetchMock = renderWith(<PendingReviewCards />, (url, init) => {
      if (init?.method === 'POST' && url.includes('/dismiss')) {
        pendientes = [];
        return new Response(null, { status: 204 });
      }
      return json(pendientes);
    });

    await user.click(
      await screen.findByRole('button', { name: 'No calificar la consulta con Ana Gómez' }),
    );

    await vi.waitFor(() =>
      expect(screen.queryByText(/cómo fue tu consulta/i)).not.toBeInTheDocument(),
    );
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes(`/reviews/pending/${TURNO}/dismiss`),
      ),
    ).toBe(true);
  });
});
