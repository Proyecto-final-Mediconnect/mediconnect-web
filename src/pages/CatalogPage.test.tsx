// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { CatalogPage } from './CatalogPage';
import type { ProfessionalCard, ProfessionalsPage } from '../features/catalog/types/catalog';

const SPECIALTIES = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Cardiología' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Pediatría' },
];

function card(i: number, overrides: Partial<ProfessionalCard> = {}): ProfessionalCard {
  return {
    id: `pro-${i}`,
    firstName: `Nombre${i}`,
    lastName: `Apellido${i}`,
    photoUrl: null,
    primarySpecialty: SPECIALTIES[0],
    specialties: [SPECIALTIES[0]],
    price: 10000 + i,
    currency: 'ARS',
    ...overrides,
  };
}

function page(
  cards: ProfessionalCard[],
  meta: Partial<ProfessionalsPage['meta']> = {},
): ProfessionalsPage {
  return {
    data: cards,
    meta: {
      page: 1,
      limit: 20,
      total: cards.length,
      totalPages: 1,
      hasNextPage: false,
      ...meta,
    },
  };
}

/** URLs de /catalog/professionals pedidas, en orden. */
let professionalRequests: string[];
/** Respuestas encoladas para /catalog/professionals (la última se repite). */
let professionalResponses: ProfessionalsPage[];
let specialtiesStatus: number;

function mockFetch() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);

    if (url.endsWith('/specialties')) {
      return Promise.resolve(
        new Response(
          specialtiesStatus === 200
            ? JSON.stringify(SPECIALTIES)
            : JSON.stringify({ message: 'boom' }),
          {
            status: specialtiesStatus,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );
    }

    if (url.includes('/catalog/professionals')) {
      professionalRequests.push(url);
      const next =
        professionalResponses.length > 1
          ? professionalResponses.shift()!
          : professionalResponses[0];
      return Promise.resolve(
        new Response(JSON.stringify(next), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }

    throw new Error(`Request inesperado en el catálogo: ${url}`);
  });
}

function renderCatalog() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Último request de listado, parseado en pares clave/valor. */
function lastQuery(): Record<string, string> {
  const url = professionalRequests[professionalRequests.length - 1];
  return Object.fromEntries(new URL(url).searchParams);
}

describe('CatalogPage (ENG-49)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    professionalRequests = [];
    professionalResponses = [page([card(1), card(2)])];
    specialtiesStatus = 200;
    mockFetch();
  });

  afterEach(cleanup);

  it('lista profesionales sin pedir sesión (búsqueda pública)', async () => {
    const fetchSpy = mockFetch();
    renderCatalog();

    expect(await screen.findByText('Nombre1 Apellido1')).toBeVisible();

    const urls = fetchSpy.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes('/auth/me'))).toBe(false);
  });

  it('pide 20 por página en la primera carga', async () => {
    renderCatalog();
    await screen.findByText('Nombre1 Apellido1');

    expect(lastQuery()).toEqual({ page: '1', limit: '20' });
  });

  it('muestra el total de resultados', async () => {
    professionalResponses = [page([card(1), card(2)], { total: 2 })];
    renderCatalog();

    expect(await screen.findByText('2 profesionales disponibles')).toBeVisible();
  });

  it('filtra por especialidad sin recargar la página', async () => {
    const user = userEvent.setup();
    renderCatalog();
    await screen.findByText('Nombre1 Apellido1');

    professionalResponses = [page([card(9)])];
    await user.selectOptions(await screen.findByLabelText('Especialidad'), SPECIALTIES[1].id);

    await waitFor(() => expect(lastQuery().specialtyId).toBe(SPECIALTIES[1].id));
    expect(await screen.findByText('Nombre9 Apellido9')).toBeVisible();
    // Sigue siendo la misma SPA: la lista se reemplazó, no hubo navegación.
    expect(screen.getByRole('heading', { name: 'Profesionales disponibles' })).toBeVisible();
  });

  it('vuelve a la página 1 al cambiar un filtro', async () => {
    const user = userEvent.setup();
    professionalResponses = [page([card(1)], { hasNextPage: true, total: 40, totalPages: 2 })];
    renderCatalog();
    await screen.findByText('Nombre1 Apellido1');

    professionalResponses = [page([card(2)], { page: 2 })];
    await user.click(screen.getByRole('button', { name: /ver más/i }));
    await waitFor(() => expect(lastQuery().page).toBe('2'));

    professionalResponses = [page([card(9)])];
    await user.selectOptions(screen.getByLabelText('Especialidad'), SPECIALTIES[1].id);

    await waitFor(() => expect(lastQuery().page).toBe('1'));
  });

  it('filtra por rango de precio', async () => {
    const user = userEvent.setup();
    renderCatalog();
    await screen.findByText('Nombre1 Apellido1');

    await user.type(screen.getByLabelText('Precio mínimo'), '5000');
    await user.type(screen.getByLabelText('Precio máximo'), '15000');

    await waitFor(() => expect(lastQuery()).toMatchObject({ minPrice: '5000', maxPrice: '15000' }));
  });

  it('no consulta al backend con un rango de precio invertido', async () => {
    const user = userEvent.setup();
    renderCatalog();
    await screen.findByText('Nombre1 Apellido1');

    await user.type(screen.getByLabelText('Precio mínimo'), '9000');
    await user.type(screen.getByLabelText('Precio máximo'), '100');

    expect(
      await screen.findByText('El precio máximo debe ser mayor o igual que el mínimo.'),
    ).toBeVisible();
    // El backend responde 400 ante maxPrice < minPrice: nunca se le pide.
    await waitFor(() => {
      expect(professionalRequests.some((url) => url.includes('maxPrice=100'))).toBe(false);
    });
  });

  it('muestra un mensaje claro cuando los filtros no dan resultados', async () => {
    const user = userEvent.setup();
    renderCatalog();
    await screen.findByText('Nombre1 Apellido1');

    professionalResponses = [page([], { total: 0, totalPages: 0 })];
    await user.selectOptions(screen.getByLabelText('Especialidad'), SPECIALTIES[1].id);

    expect(await screen.findByText('No encontramos profesionales')).toBeVisible();
    expect(screen.getByText(/Ningún profesional coincide con los filtros/)).toBeVisible();
  });

  it('distingue el catálogo vacío de la búsqueda sin resultados', async () => {
    professionalResponses = [page([], { total: 0, totalPages: 0 })];
    renderCatalog();

    expect(await screen.findByText(/Todavía no hay profesionales verificados/)).toBeVisible();
  });

  it('permite limpiar los filtros aplicados', async () => {
    const user = userEvent.setup();
    renderCatalog();
    await screen.findByText('Nombre1 Apellido1');

    await user.selectOptions(screen.getByLabelText('Especialidad'), SPECIALTIES[1].id);
    await waitFor(() => expect(lastQuery().specialtyId).toBeDefined());

    await user.click(screen.getByRole('button', { name: /limpiar filtros/i }));

    await waitFor(() => expect(lastQuery().specialtyId).toBeUndefined());
  });

  describe('scroll infinito', () => {
    it('acumula la página siguiente en vez de reemplazar la lista', async () => {
      const user = userEvent.setup();
      professionalResponses = [
        page([card(1)], { hasNextPage: true, total: 40, totalPages: 2 }),
        page([card(2)], { page: 2, hasNextPage: false, total: 40, totalPages: 2 }),
      ];
      renderCatalog();
      await screen.findByText('Nombre1 Apellido1');

      await user.click(screen.getByRole('button', { name: /ver más/i }));

      expect(await screen.findByText('Nombre2 Apellido2')).toBeVisible();
      expect(screen.getByText('Nombre1 Apellido1')).toBeVisible();
      expect(lastQuery().page).toBe('2');
    });

    it('esconde el botón cuando no quedan más páginas', async () => {
      renderCatalog();
      await screen.findByText('Nombre1 Apellido1');

      expect(screen.queryByRole('button', { name: /ver más/i })).not.toBeInTheDocument();
    });
  });

  it('ofrece reintentar si el listado falla', async () => {
    vi.restoreAllMocks();
    // Una Response nueva por llamada: el body de una sola se consume en el
    // primer `.json()` y el segundo request vería un stream ya leído.
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ message: 'Se cayó el servidor.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    renderCatalog();

    expect(await screen.findByText('Se cayó el servidor.')).toBeVisible();
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeVisible();
  });

  it('el catálogo sigue usable si falla la carga de especialidades', async () => {
    specialtiesStatus = 500;
    renderCatalog();

    expect(await screen.findByText('Nombre1 Apellido1')).toBeVisible();
    const filtros = screen.getByRole('region', { name: 'Filtros del catálogo' });
    expect(within(filtros).getByText('No pudimos cargar las especialidades.')).toBeVisible();
  });
});
