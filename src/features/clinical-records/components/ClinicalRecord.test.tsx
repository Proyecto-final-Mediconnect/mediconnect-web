// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClinicalRecord } from './ClinicalRecord';

const PATIENT = '11111111-1111-4111-8111-111111111111';

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'e1',
    patientId: PATIENT,
    professionalId: 'q1',
    professional: { firstName: 'Ana', lastName: 'García' },
    sequenceNumber: 1,
    entryType: 'CONSULTA',
    fhirResourceType: 'ClinicalImpression',
    content: {
      resourceType: 'ClinicalImpression',
      description: 'Dolor lumbar de 3 días',
      note: [{ text: 'Reposo relativo' }],
    },
    consultationId: null,
    correctsEntryId: null,
    createdAt: '2026-08-27T12:00:00.000Z',
    contentHash: 'abcd1234'.repeat(8),
    previousHash: '0'.repeat(64),
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Ultimo POST que hizo el componente, ya parseado. */
function lastPostBody(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> | undefined {
  const calls = spy.mock.calls as unknown as [RequestInfo, RequestInit?][];
  const post = calls.filter((call) => call[1]?.method === 'POST').pop();
  return post?.[1]?.body
    ? (JSON.parse(post[1].body as string) as Record<string, unknown>)
    : undefined;
}

/** Cuantos POST se dispararon. */
function postCount(spy: ReturnType<typeof vi.spyOn>): number {
  const calls = spy.mock.calls as unknown as [RequestInfo, RequestInit?][];
  return calls.filter((call) => call[1]?.method === 'POST').length;
}

/** El alta vive en un diálogo: hay que abrirlo antes de tocar el formulario. */
async function abrirAlta() {
  await userEvent.click(await screen.findByRole('button', { name: /agregar entrada/i }));
}

function renderRecord(props: { consultationId?: string } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ClinicalRecord patientId={PATIENT} {...props} />
    </QueryClientProvider>,
  );
}

describe('ClinicalRecord', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let entries: unknown[];

  beforeEach(() => {
    entries = [];
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((_input, init): Promise<Response> => {
        if ((init?.method ?? 'GET') === 'POST') {
          const created = makeEntry({ id: 'nueva', sequenceNumber: entries.length + 1 });
          entries = [...entries, created];
          return Promise.resolve(jsonResponse(created, 201));
        }
        return Promise.resolve(jsonResponse(entries));
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  describe('formulario', () => {
    it('avisa que lo guardado no se puede editar ni borrar', async () => {
      // Es lo primero que tiene que saber quien escribe un asiento clínico.
      renderRecord();
      await abrirAlta();

      expect(await screen.findByText(/no se puede editar ni borrar/i)).toBeInTheDocument();
    });

    it('ofrece los cuatro campos del criterio de aceptación', async () => {
      renderRecord();
      await abrirAlta();

      expect(screen.getByLabelText(/tipo de entrada/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/motivo de consulta/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/evolución y hallazgos/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/diagnóstico/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/plan e indicaciones/i)).toBeInTheDocument();
    });

    it('no pide la fecha: la pone el servidor al sellar', async () => {
      // Dejar elegirla permitiría antedatar un asiento con la cadena cerrando.
      renderRecord();
      await abrirAlta();

      expect(screen.queryByLabelText(/fecha/i)).not.toBeInTheDocument();
    });

    it('no ofrece CORRECCION, que es ENG-100', async () => {
      renderRecord();
      await abrirAlta();

      const select = screen.getByLabelText(/tipo de entrada/i);
      expect(within(select).queryByText(/corrección/i)).not.toBeInTheDocument();
    });

    it('exige el motivo antes de mandar nada', async () => {
      renderRecord();
      await abrirAlta();

      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

      expect(await screen.findByText(/el motivo es obligatorio/i)).toBeInTheDocument();
      expect(postCount(fetchSpy)).toBe(0);
    });

    it('manda solo los campos completados', async () => {
      renderRecord();
      await abrirAlta();

      await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Control');
      await userEvent.type(screen.getByLabelText(/plan e indicaciones/i), 'Volver en 7 días');
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

      await waitFor(() =>
        expect(lastPostBody(fetchSpy)).toEqual({
          entryType: 'CONSULTA',
          reason: 'Control',
          plan: 'Volver en 7 días',
        }),
      );
    });

    it('nunca manda professionalId ni createdAt', async () => {
      // Los dos entran a la preimagen del hash y los pone el servidor.
      renderRecord();
      await abrirAlta();

      await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Control');
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

      await waitFor(() => {
        const body = lastPostBody(fetchSpy);
        expect(body).toBeDefined();
        expect(body).not.toHaveProperty('professionalId');
        expect(body).not.toHaveProperty('createdAt');
      });
    });

    it('asocia la entrada a la consulta en curso cuando la hay', async () => {
      renderRecord({ consultationId: '44444444-4444-4444-8444-444444444444' });
      await abrirAlta();

      await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Durante la consulta');
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

      await waitFor(() =>
        expect(lastPostBody(fetchSpy)?.consultationId).toBe('44444444-4444-4444-8444-444444444444'),
      );
    });

    it('la entrada aparece en la lista apenas se guarda', async () => {
      // Es el cuarto criterio de aceptación.
      renderRecord();
      await abrirAlta();

      expect(await screen.findByText(/no hay entradas para mostrar/i)).toBeInTheDocument();

      await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Dolor lumbar de 3 días');
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

      expect(await screen.findByText('Dolor lumbar de 3 días')).toBeInTheDocument();
    });

    /**
     * Al guardar, el diálogo se cierra. Lo que hay que probar es qué se
     * encuentra quien lo vuelve a abrir: un formulario limpio y sin reclamos.
     * `attempted` quedaba en true, así que el formulario recién vaciado volvía a
     * cumplir la condición de error y mostraba "El motivo es obligatorio".
     */
    it('al reabrirlo no reclama el motivo del asiento anterior', async () => {
      renderRecord();
      await abrirAlta();

      await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Control');
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

      await abrirAlta();
      expect(screen.queryByText(/el motivo es obligatorio/i)).not.toBeInTheDocument();
    });

    it('al reabrirlo el formulario está vacío', async () => {
      // Sin esto, el segundo asiento arranca con el texto del primero a la
      // vista: en una historia clínica eso es copiar la consulta anterior sin
      // darse cuenta, y la fila no se puede borrar.
      renderRecord();
      await abrirAlta();

      await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Control');
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

      await abrirAlta();
      expect(screen.getByLabelText(/motivo de consulta/i)).toHaveValue('');
    });

    it('el diálogo se cierra al guardar', async () => {
      renderRecord();
      await abrirAlta();

      await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Control');
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

      // La confirmación es la entrada apareciendo en la lista, que es lo que
      // pide el criterio de aceptación: no hace falta un cartel además.
      await waitFor(() =>
        expect(screen.queryByLabelText(/motivo de consulta/i)).not.toBeInTheDocument(),
      );
    });

    it('se puede cerrar sin guardar', async () => {
      renderRecord();
      await abrirAlta();

      await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Me arrepentí');
      await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));

      expect(screen.queryByLabelText(/motivo de consulta/i)).not.toBeInTheDocument();
      expect(postCount(fetchSpy)).toBe(0);
    });

    it('muestra el mensaje del backend cuando rechaza', async () => {
      fetchSpy.mockImplementation((_input: unknown, init?: RequestInit) =>
        Promise.resolve(
          (init?.method ?? 'GET') === 'POST'
            ? jsonResponse(
                {
                  message:
                    'Solo podés escribir en la historia clínica de un paciente al que atendiste.',
                },
                403,
              )
            : jsonResponse([]),
        ),
      );

      renderRecord();
      await abrirAlta();
      await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Control');
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

      expect(await screen.findByText(/paciente al que atendiste/i)).toBeInTheDocument();
    });
  });

  describe('listado', () => {
    /**
     * El hash y la posición en la cadena no se muestran: son datos internos del
     * modelo de integridad, no información clínica. En cada tarjeta se leían
     * como un id de debug, y nadie compara un hash a ojo.
     */
    it('no muestra el hash ni la posición en la cadena', async () => {
      entries = [makeEntry()];
      renderRecord();

      await screen.findByText('Dolor lumbar de 3 días');
      expect(screen.queryByText(/abcd1234/)).not.toBeInTheDocument();
      expect(screen.queryByText(/sellada en la cadena/i)).not.toBeInTheDocument();
    });

    it('muestra lo más reciente primero', async () => {
      entries = [
        makeEntry({ id: 'vieja', sequenceNumber: 1, content: { description: 'La vieja' } }),
        makeEntry({ id: 'nueva', sequenceNumber: 2, content: { description: 'La nueva' } }),
      ];
      renderRecord();

      await screen.findByText('La nueva');
      const items = screen.getAllByRole('article');
      expect(items[0]).toHaveTextContent('La nueva');
    });

    /**
     * El vínculo va en los dos sentidos. Sin el lado de la corregida, quien lee
     * la original no se entera de que hay una corrección más abajo — que es
     * justamente lo que la cadena tiene que hacer visible (ENG-100).
     */
    it('enlaza la corrección con la entrada que corrige, en los dos sentidos', async () => {
      entries = [
        makeEntry({ id: 'vieja', sequenceNumber: 1, content: { description: 'La original' } }),
        makeEntry({
          id: 'correccion',
          sequenceNumber: 2,
          entryType: 'CORRECCION',
          correctsEntryId: 'vieja',
          content: { description: 'La corrige' },
        }),
      ];
      renderRecord();

      // El enlace dice a dónde lleva. Antes decía "entrada #1", que es la
      // posición en la cadena: un dato interno que obliga a buscar a mano.
      const correccion = (await screen.findByText('La corrige')).closest('article')!;
      expect(
        within(correccion).getByRole('link', { name: /ver el registro original/i }),
      ).toHaveAttribute('href', '#entrada-1');

      const original = screen.getByText('La original').closest('article')!;
      expect(within(original).getByRole('link', { name: /ver la corrección/i })).toHaveAttribute(
        'href',
        '#entrada-2',
      );
      expect(original).toHaveTextContent(/se conserva como se escribió/i);
    });

    /** La corregida puede no estar en la lista que se recibió. */
    it('si no tiene a qué enlazar, lo dice sin romperse', async () => {
      entries = [makeEntry({ entryType: 'CORRECCION', correctsEntryId: 'fuera-de-la-lista' })];
      renderRecord();

      // Sin destino no se ofrece el enlace, pero el hecho se sigue diciendo.
      expect(
        await screen.findByText(/corrige un registro anterior, que se conserva sin cambios/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /ver el registro original/i }),
      ).not.toBeInTheDocument();
    });

    /**
     * Las entradas sembradas son `Encounter`, `Condition`, `MedicationRequest` y
     * `DiagnosticReport` con claves propias, no el `ClinicalImpression` que
     * escribe la app — y la tabla es append-only, así que no se pueden migrar.
     * Sin el camino de respaldo la tarjeta sale sin una sola línea de contenido.
     */
    it('muestra el contenido aunque el recurso no sea el que escribe la app', async () => {
      entries = [
        makeEntry({
          entryType: 'PRESCRIPCION',
          fhirResourceType: 'MedicationRequest',
          content: { medicamento: 'Enalapril', dosis: '10 mg', fecha_real: '2026-08-20' },
        }),
      ];
      renderRecord();

      // El primer campo del recurso es el titular de la tarjeta: el medicamento
      // es lo que resume una prescripción, igual que el motivo resume una
      // consulta. El resto va a la grilla, con su rótulo.
      expect(await screen.findByRole('heading', { name: 'Enalapril' })).toBeInTheDocument();
      expect(screen.getByText('Dosis')).toBeInTheDocument();
      expect(screen.getByText('10 mg')).toBeInTheDocument();
      // Sin rótulo conocido, la clave se humaniza en vez de perderse.
      expect(screen.getByText('Fecha real')).toBeInTheDocument();
    });

    it('no rompe con un content de forma inesperada', async () => {
      entries = [makeEntry({ content: 'texto suelto' })];
      renderRecord();

      // La entrada se sigue mostrando —fecha y firma— aunque no haya nada
      // legible adentro: es una historia clínica, y perder el registro es peor
      // que mostrarlo sin contenido.
      expect(await screen.findByText(/no tiene contenido legible/i)).toBeInTheDocument();
      expect(screen.getByText(/firmada por Ana García/i)).toBeInTheDocument();
    });
  });

  /**
   * ENG-60 cambió el `[]` de ENG-58 por un 403 explícito para quien no tiene
   * relación con el paciente. Es un error accionable —conseguí un turno— y no
   * uno a reintentar, así que la pantalla lo separa de una caída del backend.
   */
  describe('errores', () => {
    function failWith(status: number, message: string) {
      fetchSpy.mockImplementation(
        (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
          (init?.method ?? 'GET') === 'POST'
            ? Promise.resolve(jsonResponse(makeEntry(), 201))
            : Promise.resolve(jsonResponse({ message }, status)),
      );
    }

    it('explica el 403 en vez de invitar a reintentar', async () => {
      failWith(403, 'Solo podés ver la historia clínica de un paciente con el que tenés un turno.');
      renderRecord();

      const alerta = await screen.findByRole('alert');
      expect(alerta).toHaveTextContent(/con el que tenés un turno/i);
      expect(alerta).toHaveTextContent(/reservado, confirmado o ya completado/i);
      expect(alerta).not.toHaveTextContent(/probá de nuevo/i);
    });

    it('ante una caída del backend sí ofrece reintentar', async () => {
      failWith(500, 'Se cayó el servidor.');
      renderRecord();

      // `useClinicalRecord` reintenta una vez ante un 5xx (no ante un 4xx) y el
      // backoff de react-query se come el segundo por defecto de `findBy`.
      const alerta = await screen.findByRole('alert', {}, { timeout: 3000 });
      expect(alerta).toHaveTextContent(/se cayó el servidor/i);
      expect(alerta).toHaveTextContent(/probá de nuevo/i);
    });

    /** Un 403 no puede parecer un paciente sin historia: son cosas distintas y
     *  llevan a acciones distintas. */
    it('un 403 no muestra el vacío', async () => {
      failWith(403, 'Sin acceso.');
      renderRecord();

      await screen.findByRole('alert');
      expect(screen.queryByText(/no hay entradas para mostrar/i)).not.toBeInTheDocument();
    });
  });

  /**
   * Los filtros del canvas. Una historia real tiene decenas de entradas de
   * varios profesionales; sin filtros la única herramienta es scrollear.
   */
  describe('filtros', () => {
    beforeEach(() => {
      entries = [
        makeEntry({ id: 'e1', sequenceNumber: 1, content: { description: 'La consulta' } }),
        makeEntry({
          id: 'e2',
          sequenceNumber: 2,
          entryType: 'PRESCRIPCION',
          professional: { firstName: 'Martín', lastName: 'Olivares' },
          content: { description: 'La prescripción' },
        }),
      ];
    });

    it('filtra por tipo sin volver a pedir la historia', async () => {
      renderRecord();
      await screen.findByText('La consulta');
      const antes = fetchSpy.mock.calls.length;

      await userEvent.selectOptions(screen.getByLabelText(/tipo de registro/i), 'PRESCRIPCION');

      expect(screen.queryByText('La consulta')).not.toBeInTheDocument();
      expect(screen.getByText('La prescripción')).toBeInTheDocument();
      // Cada lectura de la HC deja una fila en `audit_logs` (Ley 26.529):
      // filtrar no puede generar accesos que no ocurrieron.
      expect(fetchSpy.mock.calls.length).toBe(antes);
    });

    it('filtra por profesional', async () => {
      renderRecord();
      await screen.findByText('La consulta');

      await userEvent.selectOptions(screen.getByLabelText(/profesional/i), 'Martín Olivares');

      expect(screen.queryByText('La consulta')).not.toBeInTheDocument();
      expect(screen.getByText('La prescripción')).toBeInTheDocument();
    });

    it('cuando ningún filtro coincide lo explica y ofrece la salida', async () => {
      renderRecord();
      await screen.findByText('La consulta');

      // `fireEvent` y no `userEvent`: el input de fecha es controlado y `type`
      // dispara un cambio por carácter, con fechas intermedias inválidas.
      fireEvent.change(screen.getByLabelText(/desde/i), { target: { value: '2030-01-01' } });

      expect(screen.getByText(/ninguna entrada coincide con esos filtros/i)).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /limpiar filtros/i }));
      expect(screen.getByText('La consulta')).toBeInTheDocument();
    });

    it('no ofrece un desplegable con una sola opción', async () => {
      entries = [makeEntry()];
      renderRecord();
      await screen.findByText('Dolor lumbar de 3 días');

      // Un filtro con un único valor no filtra nada y ocupa lo mismo.
      expect(screen.queryByLabelText(/tipo de registro/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/profesional/i)).not.toBeInTheDocument();
    });

    /** No hay endpoint de exportación: la descarga es la impresión del
     *  navegador, que ya ofrece "Guardar como PDF". */
    it('el botón de PDF manda a imprimir', async () => {
      const print = vi.spyOn(window, 'print').mockImplementation(() => {});
      renderRecord();
      await screen.findByText('La consulta');

      await userEvent.click(screen.getByRole('button', { name: /descargar historia en pdf/i }));

      expect(print).toHaveBeenCalledTimes(1);
    });
  });
});
