// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { EmergencyViewPage } from './EmergencyViewPage';
import { MOCK_VITAL_BLOCK } from '../features/medipass/lib/mockMediPass';

/**
 * La vista de emergencia (ENG-135, ENG-73): pública, entra con el código que
 * trae el QR y abre un acceso de 30 minutos al bloque vital.
 */

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const EXPIRA = () => new Date(Date.now() + 30 * 60_000).toISOString();

type Respuestas = { abrir?: () => Response; consultar?: () => Response };

function Ubicacion() {
  const { search } = useLocation();
  return <p data-testid="search">{search}</p>;
}

function renderPage(url: string, respuestas: Respuestas = {}) {
  const enviados: unknown[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const ruta = String(input);
    if (ruta.endsWith('/medipass/sessions') && init?.method === 'POST') {
      enviados.push(JSON.parse(String(init.body)));
      return Promise.resolve(
        respuestas.abrir?.() ??
          json({ sesionId: 's-1', expiraEl: EXPIRA(), vital: MOCK_VITAL_BLOCK }, 201),
      );
    }
    if (ruta.includes('/medipass/sessions/')) {
      return Promise.resolve(
        respuestas.consultar?.() ?? json({ expiraEl: EXPIRA(), vital: MOCK_VITAL_BLOCK }),
      );
    }
    return Promise.resolve(json({ message: 'no' }, 404));
  });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route
            path="/medipass/emergencia"
            element={
              <>
                <EmergencyViewPage />
                <Ubicacion />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return enviados;
}

function completar(nombre: string) {
  fireEvent.change(screen.getByLabelText('Tu nombre y apellido'), { target: { value: nombre } });
  fireEvent.click(screen.getByRole('button', { name: 'Ver información vital' }));
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('EmergencyViewPage (ENG-135)', () => {
  it('con el código del QR, pide el nombre y muestra el bloque vital', async () => {
    const enviados = renderPage('/medipass/emergencia?codigo=AB12CD34');

    expect(screen.getByLabelText('Código MediPass')).toHaveValue('AB12-CD34');
    completar('Dra. Laura Pérez');

    expect(await screen.findByText(MOCK_VITAL_BLOCK.nombre)).toBeVisible();
    expect(enviados).toEqual([{ codigo: 'AB12CD34', nombre: 'Dra. Laura Pérez' }]);
    expect(screen.getByRole('timer')).toHaveTextContent(/access expires in 29:5\d|30:00/i);
  });

  // El código no se queda en la barra ni en el historial del navegador.
  it('saca el código de la URL apenas se usa', async () => {
    renderPage('/medipass/emergencia?codigo=AB12CD34');

    completar('Dra. Laura Pérez');

    await screen.findByText(MOCK_VITAL_BLOCK.nombre);
    expect(screen.getByTestId('search')).toHaveTextContent(/^$/);
  });

  it('sin código en la URL, se puede tipear', async () => {
    const enviados = renderPage('/medipass/emergencia');

    fireEvent.change(screen.getByLabelText('Código MediPass'), { target: { value: 'ab12-cd34' } });
    fireEvent.change(screen.getByLabelText('Matrícula (opcional)'), {
      target: { value: 'MP 1234' },
    });
    completar('Juan Gómez');

    await screen.findByText(MOCK_VITAL_BLOCK.nombre);
    expect(enviados).toEqual([{ codigo: 'AB12CD34', nombre: 'Juan Gómez', matricula: 'MP 1234' }]);
  });

  // Distinguir "no existe" de "venció" le diría a quien prueba códigos cuáles existieron.
  it.each([404, 410, 403])(
    'un código rechazado (%i) da siempre el mismo mensaje',
    async (status) => {
      renderPage('/medipass/emergencia?codigo=ZZZZ9999', {
        abrir: () => json({ message: 'Ese código venció hace 3 minutos' }, status),
      });

      completar('Dra. Laura Pérez');

      expect(await screen.findByRole('alert')).toHaveTextContent('Código inválido o vencido.');
      expect(screen.queryByText(/venció hace/)).not.toBeInTheDocument();
    },
  );

  // Un 400 es de validación de los datos del médico, no del código: decir
  // "código inválido" lo haría pedirle otro al paciente sin motivo.
  it('un 400 de validación muestra el mensaje del backend', async () => {
    renderPage('/medipass/emergencia?codigo=AB12CD34', {
      abrir: () =>
        json({ message: ['nombre must be shorter than or equal to 120 characters'] }, 400),
    });

    completar('Dra. Laura Pérez');

    expect(await screen.findByRole('alert')).toHaveTextContent(/shorter than or equal to 120/);
  });

  // Reescanear el QR de otro paciente en la misma pestaña: el acceso guardado es
  // del anterior y mostrarlo daría alergias y medicación equivocadas.
  it('con un código nuevo en la URL descarta el acceso guardado de la pestaña', async () => {
    sessionStorage.setItem('medipass.sesion', 's-del-paciente-anterior');
    const enviados = renderPage('/medipass/emergencia?codigo=AB12CD34');

    expect(screen.getByLabelText('Código MediPass')).toBeVisible();
    expect(sessionStorage.getItem('medipass.sesion')).toBeNull();
    const consultas = vi
      .mocked(globalThis.fetch)
      .mock.calls.filter(([ruta]) => String(ruta).includes('/medipass/sessions/'));
    expect(consultas).toEqual([]);

    completar('Dra. Laura Pérez');
    await screen.findByText(MOCK_VITAL_BLOCK.nombre);
    expect(enviados).toHaveLength(1);
  });

  it('un error que no es 410 en la primera carga ofrece reintentar y no cierra el acceso', async () => {
    sessionStorage.setItem('medipass.sesion', 's-1');
    renderPage('/medipass/emergencia', {
      consultar: () => json({ message: 'No pudimos cargar el MediPass.' }, 500),
    });

    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeVisible();
    expect(screen.queryByLabelText('Código MediPass')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('medipass.sesion')).toBe('s-1');
  });

  it('pide el nombre antes de abrir', () => {
    const enviados = renderPage('/medipass/emergencia?codigo=AB12CD34');

    fireEvent.click(screen.getByRole('button', { name: 'Ver información vital' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Completá el código y tu nombre.');
    expect(enviados).toEqual([]);
  });

  it('si el acceso venció (410), vuelve a pedir el código', async () => {
    sessionStorage.setItem('medipass.sesion', 's-viejo');
    renderPage('/medipass/emergencia', { consultar: () => json({ message: 'Gone' }, 410) });

    expect(await screen.findByRole('alert')).toHaveTextContent(/el acceso venció/i);
    expect(screen.getByLabelText('Código MediPass')).toBeVisible();
    expect(sessionStorage.getItem('medipass.sesion')).toBeNull();
  });
});

// Un paciente sin todos los datos cargados no puede mostrar "undefined" a un médico.
describe('EmergencyViewPage con datos incompletos', () => {
  it('omite lo que falta en vez de romper', async () => {
    renderPage('/medipass/emergencia?codigo=AB12CD34', {
      abrir: () =>
        json(
          {
            sesionId: 's-2',
            expiraEl: EXPIRA(),
            vital: { nombre: 'Paciente Nuevo', alergias: null, contacto: null },
          },
          201,
        ),
      consultar: () =>
        json({
          expiraEl: EXPIRA(),
          vital: { nombre: 'Paciente Nuevo', alergias: null, contacto: null },
        }),
    });

    completar('Dra. Laura Pérez');

    expect(await screen.findByText('Paciente Nuevo')).toBeVisible();
    expect(screen.getByText('No known allergies')).toBeVisible();
    expect(screen.getByText('Not recorded')).toBeVisible();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  });
});
