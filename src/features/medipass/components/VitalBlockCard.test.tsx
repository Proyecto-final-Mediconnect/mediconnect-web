// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { VitalBlockCard } from './VitalBlockCard';

afterEach(cleanup);

describe('VitalBlockCard · alergias', () => {
  it('muestra el guion solo si la alergia tiene gravedad', () => {
    render(
      <VitalBlockCard
        vital={{
          nombre: 'Julián',
          alergias: [
            { que: 'Penicilina', gravedad: '' },
            { que: 'Maní', gravedad: 'Anafilaxia' },
          ],
        }}
      />,
    );

    expect(screen.getByText('Penicilina')).toBeInTheDocument();
    expect(screen.getByText('Maní — Anafilaxia')).toBeInTheDocument();
  });
});
