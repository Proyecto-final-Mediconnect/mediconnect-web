// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const daily = vi.hoisted(() => ({
  createFrame: vi.fn(),
  join: vi.fn(),
  destroy: vi.fn(),
  iframe: vi.fn(),
  getCallInstance: vi.fn(),
}));
vi.mock('@daily-co/daily-js', () => ({
  default: { createFrame: daily.createFrame, getCallInstance: daily.getCallInstance },
}));

import { splitRoomUrl } from '../lib/splitRoomUrl';
import { DailyPrebuiltFrame } from './DailyPrebuiltFrame';

const ROOM_URL = 'https://mediconnect.daily.co/spike-eng51-a1b2c3d4?t=token';

beforeEach(() => {
  daily.createFrame
    .mockReset()
    .mockReturnValue({ join: daily.join, destroy: daily.destroy, iframe: daily.iframe });
  daily.join.mockReset().mockResolvedValue(undefined);
  daily.destroy.mockReset().mockResolvedValue(undefined);
  daily.iframe.mockReset().mockReturnValue(document.createElement('iframe'));
  daily.getCallInstance.mockReset().mockReturnValue(undefined);
});
afterEach(cleanup);

describe('splitRoomUrl', () => {
  it('separa el meeting token de la URL de la sala', () => {
    expect(splitRoomUrl(ROOM_URL)).toEqual({
      url: 'https://mediconnect.daily.co/spike-eng51-a1b2c3d4',
      token: 'token',
    });
  });

  it('sin token, devuelve la URL tal cual', () => {
    expect(splitRoomUrl('https://mediconnect.daily.co/sala')).toEqual({
      url: 'https://mediconnect.daily.co/sala',
      token: undefined,
    });
  });
});

describe('DailyPrebuiltFrame', () => {
  it('arma el frame sin el botón "Leave" y entra con el token', async () => {
    render(<DailyPrebuiltFrame roomUrl={ROOM_URL} title="Sala de prueba" />);

    await waitFor(() => expect(daily.join).toHaveBeenCalled());
    expect(daily.createFrame).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ showLeaveButton: false }),
    );
    expect(daily.join).toHaveBeenCalledWith({
      url: 'https://mediconnect.daily.co/spike-eng51-a1b2c3d4',
      token: 'token',
    });
  });

  it('descarta una instancia que haya quedado de un montaje anterior', async () => {
    const vieja = { destroy: vi.fn().mockResolvedValue(undefined) };
    daily.getCallInstance.mockReturnValue(vieja);

    render(<DailyPrebuiltFrame roomUrl={ROOM_URL} title="Sala de prueba" />);

    await waitFor(() => expect(daily.createFrame).toHaveBeenCalled());
    expect(vieja.destroy).toHaveBeenCalled();
  });

  it('al desmontar destruye el frame', async () => {
    const { unmount } = render(<DailyPrebuiltFrame roomUrl={ROOM_URL} title="Sala de prueba" />);
    await waitFor(() => expect(daily.join).toHaveBeenCalled());

    unmount();

    expect(daily.destroy).toHaveBeenCalled();
  });

  it('si no se puede entrar, lo dice en vez de dejar un recuadro negro', async () => {
    daily.join.mockRejectedValue(new Error('boom'));

    render(<DailyPrebuiltFrame roomUrl={ROOM_URL} title="Sala de prueba" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos abrir la sala/);
  });
});
