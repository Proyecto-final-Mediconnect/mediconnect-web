// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { SpecialtyChips } from './SpecialtyChips';

afterEach(cleanup);

describe('SpecialtyChips', () => {
  it('muestra cada especialidad como píldora, sin repetidos', () => {
    render(
      <SpecialtyChips
        specialties={[
          { id: 's1', name: 'Cardiología' },
          { id: 's2', name: 'Clínica Médica' },
          { id: 's1', name: 'Cardiología' },
        ]}
      />,
    );

    const lista = screen.getByRole('list', { name: 'Especialidades' });
    expect(
      within(lista)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Cardiología', 'Clínica Médica']);
  });

  it('sin especialidades lo dice en vez de dejar el hueco', () => {
    render(<SpecialtyChips specialties={[]} />);

    expect(screen.getByText('Especialidad a confirmar')).toBeVisible();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
