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

const ROOM_URL = 'https://mediconnect.daily.co/consulta-a1b2c3d4e5f6?t=token';

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
      url: 'https://mediconnect.daily.co/consulta-a1b2c3d4e5f6',
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
      url: 'https://mediconnect.daily.co/consulta-a1b2c3d4e5f6',
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

    await waitFor(() => expect(daily.destroy).toHaveBeenCalled());
  });

  it('si no se puede entrar, lo dice en vez de dejar un recuadro negro', async () => {
    daily.join.mockRejectedValue(new Error('boom'));

    render(<DailyPrebuiltFrame roomUrl={ROOM_URL} title="Sala de prueba" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos abrir la sala/);
  });

  it('volver a montar enseguida espera el destroy anterior y no muestra un error falso', async () => {
    let terminar!: () => void;
    daily.destroy.mockReturnValueOnce(new Promise<void>((r) => (terminar = r)));
    const primero = render(<DailyPrebuiltFrame roomUrl={ROOM_URL} title="Sala" />);
    await waitFor(() => expect(daily.join).toHaveBeenCalledTimes(1));
    primero.unmount();

    // La instancia vieja todavía se está destruyendo y su segundo destroy rechaza.
    daily.getCallInstance.mockReturnValue({ destroy: vi.fn().mockRejectedValue(new Error('ya')) });
    render(<DailyPrebuiltFrame roomUrl={ROOM_URL} title="Sala" />);
    await Promise.resolve();
    expect(daily.createFrame).toHaveBeenCalledTimes(1); // espera al destroy en curso

    terminar();
    await waitFor(() => expect(daily.join).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('desmontar antes de que cargue daily-js no arma ninguna llamada', async () => {
    const { unmount } = render(<DailyPrebuiltFrame roomUrl={ROOM_URL} title="Sala" />);
    unmount();
    await new Promise((r) => setTimeout(r, 20));

    expect(daily.createFrame).not.toHaveBeenCalled();
  });

  it('cambiar el title no recrea la llamada, solo actualiza el iframe', async () => {
    const iframe = document.createElement('iframe');
    daily.iframe.mockReturnValue(iframe);
    const { rerender } = render(<DailyPrebuiltFrame roomUrl={ROOM_URL} title="Sala" />);
    await waitFor(() => expect(daily.join).toHaveBeenCalled());

    rerender(<DailyPrebuiltFrame roomUrl={ROOM_URL} title="Consulta con Ana" />);

    expect(iframe.getAttribute('title')).toBe('Consulta con Ana');
    expect(daily.createFrame).toHaveBeenCalledTimes(1);
    expect(daily.destroy).not.toHaveBeenCalled();
  });

  it('tras un error, una roomUrl nueva vuelve a intentar y saca el aviso', async () => {
    daily.join.mockRejectedValueOnce(new Error('boom'));
    const { rerender } = render(<DailyPrebuiltFrame roomUrl={ROOM_URL} title="Sala" />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    rerender(<DailyPrebuiltFrame roomUrl={`${ROOM_URL}2`} title="Sala" />);

    await waitFor(() => expect(daily.join).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('una URL mal formada falla antes de armar el frame', async () => {
    render(<DailyPrebuiltFrame roomUrl="no es una url" title="Sala" />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(daily.createFrame).not.toHaveBeenCalled();
  });
});
