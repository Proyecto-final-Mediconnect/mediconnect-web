// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Explota(): never {
  throw new Error('detalle tecnico que no debe verse en pantalla');
}

beforeEach(() => {
  // React loguea el error capturado por el boundary; silenciarlo evita ruido
  // en la salida de los tests sin ocultar fallos reales.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe('ErrorBoundary', () => {
  it('renderiza los hijos cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <p>contenido normal</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('contenido normal')).toBeInTheDocument();
  });

  it('muestra la pantalla de fallback cuando un hijo lanza', () => {
    render(
      <ErrorBoundary>
        <Explota />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
  });

  it('ofrece recargar la página', () => {
    render(
      <ErrorBoundary>
        <Explota />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('button', { name: /recargar la página/i })).toBeInTheDocument();
  });

  it('no expone el detalle técnico del error al usuario', () => {
    render(
      <ErrorBoundary>
        <Explota />
      </ErrorBoundary>,
    );

    expect(screen.queryByText(/detalle tecnico/i)).not.toBeInTheDocument();
  });
});
