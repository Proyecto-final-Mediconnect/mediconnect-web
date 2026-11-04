// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SESSION_QUERY_KEY } from '../features/auth/hooks/useSession';
import type { PublicReview } from '../features/reviews/types';
import { ProfessionalReviewsPage } from './ProfessionalReviewsPage';

/** Mis reseñas (ENG-106): el profesional ve sus reseñas publicadas y las responde. */

function json(body: unknown, status = 200): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function resena(
  id: string,
  author: string,
  comment: string | null,
  response = false,
): PublicReview {
  return {
    id,
    rating: 4,
    comment,
    author,
    createdAt: '2026-11-01T15:00:00.000Z',
    response: response
      ? { content: 'Gracias por tomarte el tiempo.', createdAt: '2026-11-02T15:00:00.000Z' }
      : null,
  };
}

/** Un backend falso con estado: la respuesta guardada aparece en la próxima lectura. */
function fakeBackend(options: { rechazar?: string } = {}) {
  const reviews = [
    resena('r-1', 'Julián S.', 'Muy clara con las indicaciones.'),
    resena('r-2', 'Marina L.', 'Excelente.', true),
  ];
  const calls: { method: string; url: string; body?: unknown }[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, url, body });

    if (url.includes('/reviews/received')) {
      return Promise.resolve(
        json({
          reviews: structuredClone(reviews),
          rating: { average: 4.5, count: 2 },
          page: 1,
          hasMore: false,
        }),
      );
    }
    const match = url.match(/\/reviews\/([^/]+)\/response$/);
    if (match && method === 'PUT') {
      if (options.rechazar) {
        return Promise.resolve(json({ message: options.rechazar }, 422));
      }
      const r = reviews.find((x) => x.id === match[1])!;
      r.response = {
        content: (body as { content: string }).content,
        createdAt: '2026-11-04T12:00:00.000Z',
      };
      return Promise.resolve(
        json({ reviewId: r.id, content: r.response.content, createdAt: r.response.createdAt }),
      );
    }
    if (match && method === 'DELETE') {
      reviews.find((x) => x.id === match[1])!.response = null;
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return Promise.resolve(json({ message: 'no encontrado' }, 404));
  });
  return { calls };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(SESSION_QUERY_KEY, {
    id: 'pro-1',
    email: 'pro@test.com',
    role: 'PROFESIONAL',
    firstName: 'Ana',
    lastName: 'García',
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ProfessionalReviewsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Mis reseñas (ENG-106)', () => {
  it('muestra el promedio, las reseñas y cuántas faltan responder', async () => {
    fakeBackend();
    renderPage();

    expect(await screen.findByText('Muy clara con las indicaciones.')).toBeInTheDocument();
    expect(screen.getByText('4,5')).toBeInTheDocument();
    expect(screen.getByText(/2 reseñas publicadas · 1 sin responder/)).toBeInTheDocument();
    expect(screen.getByText('Gracias por tomarte el tiempo.')).toBeInTheDocument();
  });

  it('responde una reseña y la respuesta queda publicada', async () => {
    const user = userEvent.setup();
    const { calls } = fakeBackend();
    renderPage();

    const tarjeta = (await screen.findByText('Julián S.')).closest('li')!;
    await user.click(within(tarjeta).getByRole('button', { name: 'Responder' }));
    await user.type(
      within(tarjeta).getByLabelText('Tu respuesta a Julián S.'),
      '  Gracias, Julián. Nos vemos en el control.  ',
    );
    await user.click(within(tarjeta).getByRole('button', { name: 'Publicar respuesta' }));

    expect(
      await within(tarjeta).findByText('Gracias, Julián. Nos vemos en el control.'),
    ).toBeInTheDocument();
    expect(calls).toContainEqual(
      expect.objectContaining({
        method: 'PUT',
        body: { content: 'Gracias, Julián. Nos vemos en el control.' },
      }),
    );
  });

  it('si el filtro de lenguaje la rechaza, muestra el motivo y no pierde lo escrito (ENG-107)', async () => {
    const user = userEvent.setup();
    fakeBackend({
      rechazar: 'Tu respuesta tiene palabras que no podemos publicar. Reformulala, por favor.',
    });
    renderPage();

    const tarjeta = (await screen.findByText('Julián S.')).closest('li')!;
    await user.click(within(tarjeta).getByRole('button', { name: 'Responder' }));
    const campo = within(tarjeta).getByLabelText('Tu respuesta a Julián S.');
    await user.type(campo, 'Una respuesta');
    await user.click(within(tarjeta).getByRole('button', { name: 'Publicar respuesta' }));

    expect(await within(tarjeta).findByRole('alert')).toHaveTextContent(/Reformulala/);
    expect(campo).toHaveValue('Una respuesta');
  });

  it('edita la respuesta que ya tenía, con el texto cargado', async () => {
    const user = userEvent.setup();
    fakeBackend();
    renderPage();

    const tarjeta = (await screen.findByText('Marina L.')).closest('li')!;
    await user.click(within(tarjeta).getByRole('button', { name: 'Editar' }));

    expect(within(tarjeta).getByLabelText('Tu respuesta a Marina L.')).toHaveValue(
      'Gracias por tomarte el tiempo.',
    );
  });

  it('borrar pide confirmación y la respuesta deja de verse', async () => {
    const user = userEvent.setup();
    const { calls } = fakeBackend();
    renderPage();

    const tarjeta = (await screen.findByText('Marina L.')).closest('li')!;
    await user.click(within(tarjeta).getByRole('button', { name: 'Borrar' }));
    await user.click(screen.getByRole('button', { name: 'Borrar respuesta' }));

    await waitFor(() =>
      expect(screen.queryByText('Gracias por tomarte el tiempo.')).not.toBeInTheDocument(),
    );
    expect(
      calls.some((c) => c.method === 'DELETE' && c.url.endsWith('/reviews/r-2/response')),
    ).toBe(true);
  });

  it('sin reseñas lo explica', async () => {
    // Solo las reseñas responden: el menú también pide los turnos, y una lista
    // de reseñas en su lugar lo rompería.
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
      Promise.resolve(
        String(input).includes('/reviews/received')
          ? json({ reviews: [], rating: null, page: 1, hasMore: false })
          : json({ message: 'no encontrado' }, 404),
      ),
    );
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Todavía no tenés reseñas' }),
    ).toBeInTheDocument();
  });
});
