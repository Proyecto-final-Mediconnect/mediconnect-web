// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MonthCalendar } from './MonthCalendar';

const DATES = ['2026-08-17', '2026-08-18', '2026-08-19'];

function renderMonth() {
  render(
    <MonthCalendar
      dates={DATES}
      libresPorFecha={{ '2026-08-17': 2, '2026-08-18': 1 }}
      activeDate={null}
      onPick={vi.fn()}
    />,
  );
}

describe('MonthCalendar', () => {
  afterEach(cleanup);

  it('marca como hoy solo el primer día de la ventana', () => {
    renderMonth();

    const hoy = screen.getByRole('button', { name: /^17 — 2 horarios libres \(hoy\)$/ });
    expect(hoy).toHaveAttribute('aria-current', 'date');
    const otro = screen.getByRole('button', { name: /^18 — / });
    expect(otro).not.toHaveAttribute('aria-current');
    expect(otro.getAttribute('aria-label')).not.toMatch(/\(hoy\)/);
  });
});
