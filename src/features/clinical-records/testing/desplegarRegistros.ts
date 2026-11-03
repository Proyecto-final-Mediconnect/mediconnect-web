import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect } from 'vitest';

/**
 * Despliega todas las filas de la historia clínica. En los tests no hay
 * `matchMedia`, así que la pantalla se arma como en un celular: el detalle de
 * cada registro va debajo de su fila y aparece al tocarla.
 */
export async function desplegarRegistros(): Promise<void> {
  await waitFor(() => expect(document.querySelector('li[id^="fila-"]')).not.toBeNull());
  const cerradas = document.querySelectorAll<HTMLButtonElement>(
    'li[id^="fila-"] > button[aria-expanded="false"]',
  );
  for (const fila of cerradas) await userEvent.click(fila);
}
