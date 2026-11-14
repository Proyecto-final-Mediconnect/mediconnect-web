// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { TimeSelect } from './TimeSelect';

afterEach(cleanup);

describe('TimeSelect', () => {
  it('ofrece las horas en 24 h, cada 15 minutos', () => {
    render(<TimeSelect aria-label="Desde" value="09:00" onChange={() => {}} />);
    const opciones = screen.getAllByRole('option').map((o) => o.textContent);

    expect(opciones).toHaveLength(96);
    expect(opciones).toContain('13:45');
    expect(opciones.some((o) => /a\.?m|p\.?m/i.test(o ?? ''))).toBe(false);
    expect(screen.getByRole('combobox', { name: 'Desde' })).toHaveValue('09:00');
  });

  it('con emptyLabel suma una opción vacía, y no pierde un horario fuera de la grilla', () => {
    render(<TimeSelect aria-label="Hasta" value="10:20" emptyLabel="—" onChange={() => {}} />);

    expect(screen.getByRole('option', { name: '—' })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Hasta' })).toHaveValue('10:20');
  });
});
