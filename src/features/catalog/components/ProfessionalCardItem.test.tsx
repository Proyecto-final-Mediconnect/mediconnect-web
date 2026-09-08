// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ProfessionalCardItem } from './ProfessionalCardItem';
import type { ProfessionalCard } from '../types/catalog';

const base: ProfessionalCard = {
  id: '11111111-1111-4111-8111-111111111111',
  firstName: 'Ana',
  lastName: 'Álvarez',
  photoUrl: 'https://cdn.test/ana.jpg',
  primarySpecialty: { id: 'spec-1', name: 'Cardiología' },
  specialties: [{ id: 'spec-1', name: 'Cardiología' }],
  price: 12000,
  currency: 'ARS',
};

function renderCard(overrides: Partial<ProfessionalCard> = {}) {
  // Router porque la tarjeta es un `<Link>` al perfil público (ENG-50), y
  // QueryClient porque el botón de reservar consulta la sesión para saber si
  // ofrecerlo: reservar es solo para pacientes. Sin sesión (401) se comporta
  // como con un visitante anónimo, que es lo que estos casos describen.
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }));

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ul>
          <ProfessionalCardItem
            professional={{ ...base, ...overrides }}
            basePath="/profesionales"
          />
        </ul>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ProfessionalCardItem', () => {
  it('muestra foto, nombre, especialidad principal y precio', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Ana Álvarez' })).toBeVisible();
    expect(screen.getByText('Cardiología')).toBeVisible();
    expect(screen.getByAltText('Foto de Ana Álvarez')).toHaveAttribute(
      'src',
      'https://cdn.test/ana.jpg',
    );
    expect(screen.getByText(/12\.000/)).toBeVisible();
  });

  it('cae a las iniciales cuando no hay foto', () => {
    renderCard({ photoUrl: null });

    expect(screen.queryByAltText('Foto de Ana Álvarez')).not.toBeInTheDocument();
    expect(screen.getByText('AÁ')).toBeInTheDocument();
  });

  it('no rompe si el profesional no tiene especialidad asignada', () => {
    renderCard({ primarySpecialty: null, specialties: [] });

    expect(screen.getByText('Especialidad a confirmar')).toBeVisible();
  });

  it('toda la tarjeta enlaza al perfil público del profesional', () => {
    renderCard();

    expect(screen.getByRole('link', { name: 'Ver el perfil de Ana Álvarez' })).toHaveAttribute(
      'href',
      `/profesionales/${base.id}`,
    );
  });
});
