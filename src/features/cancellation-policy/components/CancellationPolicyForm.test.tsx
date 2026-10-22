// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CancellationPolicyForm } from './CancellationPolicyForm';

const DEFAULT = {
  hoursFullRefund: 24,
  hoursPartialRefund: 6,
  partialRefundPercent: 50,
  configured: false,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Cuerpos enviados en cada PUT, para afirmar qué se guarda. */
let putBodies: unknown[] = [];

function mockFetch(initial: unknown = DEFAULT, onPut?: (body: unknown) => Response) {
  putBodies = [];
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    if (String(input).endsWith('/professionals/me/cancellation-policy')) {
      if (init?.method === 'PUT') {
        const body: unknown = JSON.parse(String(init.body));
        putBodies.push(body);
        return Promise.resolve(
          onPut?.(body) ?? jsonResponse({ ...(body as object), configured: true }),
        );
      }
      return Promise.resolve(jsonResponse(initial));
    }
    return Promise.resolve(jsonResponse({}, 404));
  });
}

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CancellationPolicyForm />
    </QueryClientProvider>,
  );
}

async function campo(nombre: RegExp) {
  return screen.findByRole('spinbutton', { name: nombre });
}

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe('CancellationPolicyForm', () => {
  it('muestra la política por defecto marcada como tal', async () => {
    mockFetch();
    renderForm();

    expect(await campo(/devolución total/i)).toHaveValue(24);
    expect(screen.getByRole('spinbutton', { name: /devolución parcial si/i })).toHaveValue(6);
    expect(screen.getByRole('spinbutton', { name: /porcentaje/i })).toHaveValue(50);
    expect(screen.getByText('Por defecto')).toBeInTheDocument();
    expect(screen.getByText(/Entre 24 horas y 6 horas antes, el 50 %/)).toBeInTheDocument();
  });

  it('una política ya configurada no lleva la marca de por defecto', async () => {
    mockFetch({ ...DEFAULT, hoursFullRefund: 48, configured: true });
    renderForm();

    expect(await campo(/devolución total/i)).toHaveValue(48);
    expect(screen.queryByText('Por defecto')).not.toBeInTheDocument();
  });

  it('guarda solo los tres campos y avisa que se guardó', async () => {
    const user = userEvent.setup();
    mockFetch();
    renderForm();

    const total = await campo(/devolución total/i);
    await user.clear(total);
    await user.type(total, '48');
    const pct = screen.getByRole('spinbutton', { name: /porcentaje/i });
    await user.clear(pct);
    await user.type(pct, '30');
    await user.click(screen.getByRole('button', { name: /guardar política/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('Guardamos tu política.');
    expect(putBodies).toEqual([
      { hoursFullRefund: 48, hoursPartialRefund: 6, partialRefundPercent: 30 },
    ]);
    expect(screen.queryByText('Por defecto')).not.toBeInTheDocument();
  });

  it('no manda nada si la ventana parcial es más lejana que la total', async () => {
    const user = userEvent.setup();
    mockFetch();
    renderForm();

    const parcial = await campo(/devolución parcial si/i);
    await user.clear(parcial);
    await user.type(parcial, '30');
    await user.click(screen.getByRole('button', { name: /guardar política/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/más anticipación/);
    expect(putBodies).toEqual([]);
  });

  it('marca el error al salir del campo, sin esperar al guardado', async () => {
    const user = userEvent.setup();
    mockFetch();
    renderForm();

    const pct = await campo(/porcentaje/i);
    await user.clear(pct);
    await user.type(pct, '150');
    await user.tab();

    expect(screen.getByRole('alert')).toHaveTextContent(/entre 0 y 100/);
    expect(pct).toHaveAttribute('aria-invalid', 'true');
  });

  it('un campo vacío no se guarda como cero', async () => {
    const user = userEvent.setup();
    mockFetch();
    renderForm();

    await user.clear(await campo(/devolución total/i));
    await user.click(screen.getByRole('button', { name: /guardar política/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/entero/);
    expect(putBodies).toEqual([]);
  });

  it('muestra el error del backend si el guardado falla', async () => {
    const user = userEvent.setup();
    mockFetch(DEFAULT, () =>
      jsonResponse({ statusCode: 409, message: 'Completá tu perfil profesional primero.' }, 409),
    );
    renderForm();

    await user.click(await screen.findByRole('button', { name: /guardar política/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Completá tu perfil profesional primero.',
      ),
    );
  });
});
