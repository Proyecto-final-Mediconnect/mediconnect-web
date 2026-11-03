import { describe, expect, it } from 'vitest';
import { cuentaRegresiva, emergencyCardUrl, tarjetaDelHash } from './medipass';

describe('cuentaRegresiva', () => {
  it('formatea minutos y segundos', () => {
    expect(cuentaRegresiva(5 * 60_000)).toBe('05:00');
    expect(cuentaRegresiva(62_000)).toBe('01:02');
  });

  it('nunca muestra negativos', () => {
    expect(cuentaRegresiva(-5000)).toBe('00:00');
  });

  it('se corta en 59:59 en vez de agregar un campo de horas', () => {
    expect(cuentaRegresiva(3 * 60 * 60_000)).toBe('59:59');
  });
});

describe('tarjeta de emergencia (ENG-176)', () => {
  const TOKEN = 'Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3';

  it('el token va en el fragmento, que no viaja a ningún servidor', () => {
    const url = emergencyCardUrl('https://mediconnect.app', TOKEN);
    expect(url).toBe(`https://mediconnect.app/medipass/emergencia#tarjeta=${TOKEN}`);
    expect(new URL(url).search).toBe('');
  });

  it('lee la tarjeta del fragmento, con o sin #', () => {
    expect(tarjetaDelHash(`#tarjeta=${TOKEN}`)).toBe(TOKEN);
    expect(tarjetaDelHash(`tarjeta=${TOKEN}`)).toBe(TOKEN);
  });

  it('sin tarjeta, o con algo que no tiene forma de token, devuelve null', () => {
    expect(tarjetaDelHash('')).toBeNull();
    expect(tarjetaDelHash('#otra=cosa')).toBeNull();
    expect(tarjetaDelHash('#tarjeta=corta')).toBeNull();
    expect(tarjetaDelHash('#tarjeta=%3Cscript%3E')).toBeNull();
  });
});
