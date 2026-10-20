// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LegalPage } from './LegalPage';

/**
 * Los textos legales (ENG-140).
 *
 * Lo que se prueba acá es que entrar directo con un fragmento lleve a su
 * sección: es como los abren los enlaces de la casilla del registro, que se
 * abren en otra pestaña para no perder lo que el usuario ya escribió.
 */

function renderLegal(entrada = '/legales') {
  // La página es pública, pero su encabezado consulta la sesión: sin sesión,
  // que es como la lee alguien que todavía no tiene cuenta.
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }));

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entrada]}>
        <Routes>
          <Route path="/legales" element={<LegalPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LegalPage (ENG-140)', () => {
  let scrollIntoView: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // jsdom no implementa scrollIntoView, así que no hay nada que espiar.
    scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView =
      scrollIntoView as unknown as typeof Element.prototype.scrollIntoView;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('muestra las tres secciones', () => {
    renderLegal();

    expect(screen.getByRole('heading', { name: /términos y condiciones/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /política de privacidad/i })).toBeInTheDocument();
  });

  it('sin fragmento no scrollea a ninguna parte', () => {
    renderLegal();

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it.each(['terminos', 'privacidad', 'consentimiento'])(
    'entrando con #%s lleva a esa sección',
    (id) => {
      renderLegal(`/legales#${id}`);

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      // El elemento sobre el que se llamó es el de ese id, no otro.
      expect(scrollIntoView.mock.instances[0]).toBe(document.getElementById(id));
    },
  );

  it('un fragmento que no existe no rompe la página', () => {
    renderLegal('/legales#no-existe');

    expect(screen.getByRole('heading', { name: /términos y condiciones/i })).toBeInTheDocument();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
