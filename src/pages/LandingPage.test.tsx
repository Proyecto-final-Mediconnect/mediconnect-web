// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage';

function renderLanding() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/**
 * ENG-225 — lo que dice la landing tiene que ser verdadero y verificable en la
 * app. Estos casos fijan las correcciones para que no vuelvan.
 */
describe('Landing', () => {
  // La barra pública pregunta si hay sesión: acá no la hay.
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('las ilustraciones del MediPass están rotuladas como ejemplo, sin datos de una persona', () => {
    const { container } = renderLanding();

    expect(screen.getAllByText('Ejemplo')).toHaveLength(2);
    expect(screen.getAllByText(/Paciente de ejemplo/).length).toBeGreaterThan(0);
    expect(container).not.toHaveTextContent('Marina Sosa');
    expect(container).not.toHaveTextContent('MP-AR-');
  });

  it('el código de ejemplo tiene el formato del código real: 8 caracteres sin vocales', () => {
    renderLanding();

    // `CODE_ALPHABET` del backend (medipass.config.ts), en dos grupos de 4 como
    // lo muestra `formatCodigo`.
    const formato = /^[2-9BCDFGHJKLMNPQRSTVWXZ]{4}-[2-9BCDFGHJKLMNPQRSTVWXZ]{4}$/;
    const codigos = screen.getAllByText(formato);
    expect(codigos).toHaveLength(2);
  });

  it('no promete lo que la app no hace', () => {
    const { container } = renderLanding();

    // Se audita la lectura de la historia entera (ENG-165), no por parte.
    expect(container).not.toHaveTextContent(/qué parte miró|qué miró/);
    // El MediPass lo carga el paciente: las consultas no lo llenan.
    expect(container).not.toHaveTextContent(/en tu historia clínica y en tu MediPass/);
    // La historia se guarda en PDF desde el diálogo de impresión (ENG-231).
    expect(container).not.toHaveTextContent(/descargarla en PDF/);
    expect(container).toHaveTextContent('Sabés qué profesional la abrió y cuándo.');
  });
});
