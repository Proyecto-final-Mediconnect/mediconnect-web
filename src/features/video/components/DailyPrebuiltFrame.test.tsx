// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DailyPrebuiltFrame } from './DailyPrebuiltFrame';

afterEach(cleanup);

describe('DailyPrebuiltFrame', () => {
  const ROOM_URL = 'https://mediconnect.daily.co/spike-eng51-a1b2c3d4?t=token';

  it('apunta el iframe a la URL tokenizada de la sala', () => {
    render(<DailyPrebuiltFrame roomUrl={ROOM_URL} title="Sala de prueba" />);

    expect(screen.getByTitle('Sala de prueba')).toHaveAttribute('src', ROOM_URL);
  });

  it.each(['camera', 'microphone', 'display-capture', 'autoplay'])(
    'delega el permiso "%s" al iframe',
    (permission) => {
      // Es el punto que hace o rompe el embed: un iframe cross-origin no hereda
      // los permisos de cámara/micrófono de la página que lo contiene, y sin
      // ellos Prebuilt carga bien y recién falla al pedir los dispositivos.
      render(<DailyPrebuiltFrame roomUrl={ROOM_URL} title="Sala de prueba" />);

      expect(screen.getByTitle('Sala de prueba').getAttribute('allow')).toContain(permission);
    },
  );
});
