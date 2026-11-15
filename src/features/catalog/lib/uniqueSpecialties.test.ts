import { describe, expect, it } from 'vitest';
import { uniqueSpecialties } from './uniqueSpecialties';

const s = (id: string, name: string) => ({ id, name });

describe('uniqueSpecialties', () => {
  it('saca los repetidos por id', () => {
    expect(uniqueSpecialties([s('1', 'Cardiología'), s('1', 'Cardiología')])).toEqual([
      s('1', 'Cardiología'),
    ]);
  });

  it('saca los repetidos por nombre aunque cambien tildes, mayúsculas o espacios', () => {
    expect(
      uniqueSpecialties([s('1', 'Cardiología'), s('2', ' cardiologia '), s('3', 'Pediatría')]),
    ).toEqual([s('1', 'Cardiología'), s('3', 'Pediatría')]);
  });

  it('descarta nombres vacíos', () => {
    expect(uniqueSpecialties([s('1', '  '), s('2', 'Clínica')])).toEqual([s('2', 'Clínica')]);
  });

  it('pone adelante la principal', () => {
    expect(
      uniqueSpecialties([s('1', 'Clínica'), s('2', 'Cardiología')], '2').map((x) => x.id),
    ).toEqual(['2', '1']);
  });
});
