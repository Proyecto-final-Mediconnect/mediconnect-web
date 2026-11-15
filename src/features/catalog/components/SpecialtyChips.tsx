import { uniqueSpecialties } from '../lib/uniqueSpecialties';
import type { Specialty } from '../types/catalog';

/**
 * Especialidades del profesional como píldoras.
 *
 * Antes iban todas en un renglón unidas con "·": con tres o cuatro el texto
 * cortaba a mitad de nombre y no se distinguía dónde terminaba una. Como
 * píldoras cada una se lee sola y la fila hace wrap sin desbordar.
 *
 * La primera va destacada con el teal de la marca y el resto en neutro, el mismo
 * par de estilos que usa la tarjeta del catálogo.
 */
export function SpecialtyChips({
  specialties,
  primaryId,
  className = '',
}: {
  specialties: Specialty[];
  /** La principal, si se conoce. Sin ella se destaca la primera que llega. */
  primaryId?: string;
  className?: string;
}) {
  const unicas = uniqueSpecialties(specialties, primaryId);

  if (unicas.length === 0) {
    return (
      <p className={`text-[15px] font-medium text-muted ${className}`}>Especialidad a confirmar</p>
    );
  }

  return (
    <ul aria-label="Especialidades" className={`flex flex-wrap gap-1.5 ${className}`}>
      {unicas.map((specialty, i) => (
        <li
          key={specialty.id}
          className={`max-w-full break-words rounded-full px-3 py-1 text-[13px] leading-snug ${
            i === 0
              ? 'bg-surface-teal font-semibold text-brand-hover'
              : 'border border-line bg-surface font-medium text-muted'
          }`}
        >
          {specialty.name}
        </li>
      ))}
    </ul>
  );
}
