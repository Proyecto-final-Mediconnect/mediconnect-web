// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PublicProfile } from './PublicProfile';

/**
 * Los estados de carga y error se prueban acá, sobre el componente, y no en la
 * página: montar la query real haría que el caso de error espere los reintentos
 * de react-query.
 */
function renderProfile(props: Partial<Parameters<typeof PublicProfile>[0]> = {}) {
  return render(
    <MemoryRouter>
      <PublicProfile
        profile={undefined}
        isLoading={false}
        isError={false}
        isNotFound={false}
        onRetry={() => {}}
        {...props}
      />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('PublicProfile', () => {
  it('avisa mientras carga', () => {
    renderProfile({ isLoading: true });

    expect(screen.getByRole('status')).toHaveTextContent('Cargando perfil…');
  });

  it('ante un error del servidor muestra el mensaje y deja reintentar', async () => {
    const onRetry = vi.fn();
    renderProfile({ isError: true, errorMessage: 'Se cayó todo', onRetry });

    expect(screen.getByText('Se cayó todo')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('cae a un mensaje genérico si el error no trae texto', () => {
    renderProfile({ isError: true });

    expect(screen.getByText('No pudimos cargar el perfil.')).toBeVisible();
  });

  it('ante un 404 no ofrece reintentar y manda de vuelta al catálogo', () => {
    renderProfile({ isError: true, isNotFound: true });

    expect(screen.getByText('No encontramos este profesional')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al catálogo' })).toHaveAttribute(
      'href',
      '/profesionales',
    );
  });

  it('no se rompe si no hay perfil y tampoco hay error declarado', () => {
    // Defensa contra un estado imposible: sin datos igual muestra el bloque de
    // error en vez de intentar leer `profile.firstName` y explotar.
    renderProfile();

    expect(screen.getByText('No pudimos cargar el perfil.')).toBeVisible();
  });
});
