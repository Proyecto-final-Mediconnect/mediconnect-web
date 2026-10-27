// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SideDrawer } from './SideDrawer';

afterEach(cleanup);

describe('SideDrawer (ENG-178)', () => {
  it('el foco inicial se da una sola vez aunque el padre vuelva a renderizar', async () => {
    const { rerender } = render(
      <SideDrawer open title="Detalle" onClose={() => undefined}>
        <button type="button">Acción</button>
      </SideDrawer>,
    );
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus();

    screen.getByRole('button', { name: 'Acción' }).focus();
    // `onClose` nueva en cada render, como en MyAppointments.
    rerender(
      <SideDrawer open title="Detalle" onClose={() => undefined}>
        <button type="button">Acción</button>
      </SideDrawer>,
    );
    expect(screen.getByRole('button', { name: 'Acción' })).toHaveFocus();
  });

  it('Escape cierra el panel, pero no el que nace dentro de un diálogo', async () => {
    const onClose = vi.fn();
    render(
      <SideDrawer open title="Detalle" onClose={onClose}>
        <dialog open>
          <button type="button">Dentro</button>
        </dialog>
      </SideDrawer>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Dentro' }));
    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();

    screen.getByRole('button', { name: 'Cerrar' }).focus();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
