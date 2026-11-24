import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import {
  cabecera,
  COLOR,
  conMargen,
  documento,
  indicadores,
  MM,
  raya,
  rotulo,
} from '../../../shared/lib/pdf/hoja';
import { readEntryFields, shortHash } from './clinicalEntry';
import { nombreDe, ordenarRecientesPrimero } from './filtrarEntradas';
import { ENTRY_TYPE_LABELS, type ClinicalEntry } from '../types/clinicalRecord';

const ZONA = 'America/Argentina/Buenos_Aires';
const DIA = new Intl.DateTimeFormat('es-AR', { day: 'numeric', timeZone: ZONA });
const MES_ANIO = new Intl.DateTimeFormat('es-AR', {
  month: 'short',
  year: 'numeric',
  timeZone: ZONA,
});
const HORA = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: ZONA,
});
const FECHA = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: ZONA,
});

/** El tipo en plural, para el resumen ("3 consultas · 1 corrección"). */
const PLURALES: Record<string, string> = {
  CONSULTA: 'Consultas',
  DIAGNOSTICO: 'Diagnósticos',
  PRESCRIPCION: 'Prescripciones',
  ESTUDIO: 'Estudios',
  CORRECCION: 'Correcciones',
};

/**
 * La historia clínica en PDF (ENG-231).
 *
 * Encabezado con el logo, el paciente y la fecha de emisión; un resumen (cuántos
 * registros, de qué tipo, con cuántos profesionales y entre qué fechas); la nota
 * de integridad; y cada registro con su fecha, quién lo firmó, sus campos, el
 * vínculo de corrección y el sello de la cadena. Desde la segunda hoja se
 * repite arriba de quién es y cuándo se emitió.
 *
 * Antes de bajarla, la pantalla registra la descarga en el backend
 * (`recordClinicalRecordExport`): sin ese registro no se genera.
 */
export function clinicalRecordPdf({
  entries,
  total,
  corregidaPor,
  posicionDe,
  paciente,
  ahora = new Date(),
}: {
  /** Lo que se exporta. Sale del más reciente al más antiguo, llegue como llegue. */
  entries: ClinicalEntry[];
  /** Cuántos registros tiene la historia completa, para avisar si hay filtros. */
  total: number;
  corregidaPor: Map<string, number>;
  posicionDe: Map<string, number>;
  paciente?: string;
  ahora?: Date;
}): TDocumentDefinitions {
  const profesionales = new Set(entries.map((e) => e.professionalId)).size;
  const fechas = entries.map((e) => e.createdAt).sort();
  const porTipo = new Map<string, number>();
  for (const e of entries) porTipo.set(e.entryType, (porTipo.get(e.entryType) ?? 0) + 1);
  const resumenTipos = [...porTipo.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tipo, n]) =>
      `${n} ${(n === 1 ? ENTRY_TYPE_LABELS[tipo] : PLURALES[tipo]) ?? tipo}`.toLowerCase(),
    )
    .join(' · ');
  const filtrada = entries.length !== total;

  return documento({
    titulo: paciente ? `Historia clínica de ${paciente}` : 'Historia clínica',
    leyenda:
      'Documento generado desde MediConnect. Los registros clínicos no se pueden modificar ni borrar',
    encabezado: `MediConnect · Historia clínica${paciente ? ` de ${paciente}` : ''}`,
    ahora,
    contenido: [
      cabecera({
        titulo: 'Historia clínica',
        persona: paciente,
        destacarPrimera: false,
        derecha: [
          `Emitida el ${FECHA.format(ahora)}`,
          filtrada ? `${entries.length} de ${total} registros (con filtros)` : `${total} registros`,
        ],
      }),
      indicadores([
        { etiqueta: 'Registros', valor: String(entries.length), detalle: resumenTipos },
        {
          etiqueta: 'Profesionales',
          valor: String(profesionales),
          detalle: profesionales === 1 ? 'firmó los registros' : 'firmaron registros',
        },
        {
          etiqueta: 'Primer registro',
          valor: fechas[0] ? FECHA.format(new Date(fechas[0])) : '—',
          chico: true,
        },
        {
          etiqueta: 'Último registro',
          valor: fechas.at(-1) ? FECHA.format(new Date(fechas.at(-1)!)) : '—',
          chico: true,
        },
      ]),
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: [
                  { text: 'Registro inalterable. ', bold: true, color: COLOR.brandDeep },
                  'Cada registro queda sellado con un hash SHA-256 de su contenido y del registro anterior, y se guarda en el estándar internacional FHIR. Nada se edita ni se borra: una corrección es un registro nuevo vinculado al original, y los dos figuran en este documento.',
                ],
                fontSize: 8.5,
                fillColor: COLOR.surface,
              },
            ],
          ],
        },
        layout: {
          hLineColor: () => COLOR.line,
          vLineColor: () => COLOR.line,
          hLineWidth: () => 0.75,
          vLineWidth: () => 0.75,
          paddingLeft: () => 10,
          paddingRight: () => 10,
          paddingTop: () => 7,
          paddingBottom: () => 7,
        },
        margin: [0, 12, 0, 0],
      },
      conMargen(
        rotulo('Registros, del más reciente al más antiguo', COLOR.brandDeep),
        [0, 18, 0, 4],
      ),
      ...ordenarRecientesPrimero(entries).map((e) =>
        registro(
          e,
          corregidaPor.get(e.id),
          e.correctsEntryId ? posicionDe.get(e.correctsEntryId) : undefined,
        ),
      ),
    ],
  });
}

/** Un registro: la fecha a la izquierda y el contenido a la derecha. */
function registro(entry: ClinicalEntry, corregidaPor?: number, corrigeA?: number): Content {
  const fecha = new Date(entry.createdAt);
  const campos = readEntryFields(entry);
  const tipo = ENTRY_TYPE_LABELS[entry.entryType] ?? entry.entryType;
  const motivo = motivoDeCorreccion(entry.content);

  return {
    stack: [
      raya(COLOR.line, 0.75, [0, 0, 0, 10]),
      {
        columns: [
          {
            width: 24 * MM,
            stack: [
              {
                text: DIA.format(fecha),
                font: 'Newsreader',
                fontSize: 22,
                color: COLOR.brandDeep,
                lineHeight: 1,
              },
              {
                text: MES_ANIO.format(fecha).replace('.', '').toUpperCase(),
                fontSize: 7.5,
                font: 'ManropeSemibold',
                characterSpacing: 0.6,
                color: COLOR.brandDeep,
                margin: [0, 3, 0, 0],
              },
              { text: `${HORA.format(fecha)} h`, fontSize: 7.5, color: COLOR.muted },
            ],
          },
          {
            width: '*',
            stack: [
              {
                text: [
                  { text: tipo.toUpperCase(), bold: true, color: COLOR.brandDeep },
                  ...(corregidaPor !== undefined
                    ? [{ text: '   CORREGIDO', bold: true, color: COLOR.muted }]
                    : []),
                  { text: `   Registro N.º ${entry.sequenceNumber}`, color: COLOR.muted },
                ],
                fontSize: 7,
                characterSpacing: 0.6,
              },
              {
                text: ['Firmado por ', { text: nombreDe(entry), bold: true }],
                fontSize: 9,
                margin: [0, 4, 0, 0],
              },
              ...campos.map((c) => ({
                stack: [
                  rotulo(c.label),
                  { text: c.value, fontSize: 9, lineHeight: 1.3, margin: [0, 2, 0, 0] },
                ] as Content[],
                margin: [0, 7, 0, 0],
              })),
              ...(corrigeA !== undefined
                ? [
                    {
                      text: `Corrige el registro N.º ${corrigeA}, que se conserva sin cambios en este documento.${
                        motivo ? ` Motivo: ${motivo}` : ''
                      }`,
                      fontSize: 8,
                      color: COLOR.brandHover,
                      margin: [0, 7, 0, 0],
                    },
                  ]
                : []),
              ...(corregidaPor !== undefined
                ? [
                    {
                      text: `Tiene una corrección posterior (registro N.º ${corregidaPor}). Se conserva como se escribió.`,
                      fontSize: 8,
                      color: COLOR.muted,
                      margin: [0, 7, 0, 0],
                    },
                  ]
                : []),
              {
                text: `Sello ${shortHash(entry.contentHash)} · encadenado con ${shortHash(entry.previousHash)}`,
                fontSize: 7,
                color: COLOR.muted,
                characterSpacing: 0.4,
                margin: [0, 7, 0, 0],
              },
            ] as Content[],
          },
        ],
        columnGap: 12,
      },
    ],
    // Un registro no se parte entre dos hojas: cortado se lee mal y, peor, se
    // puede leer incompleto.
    unbreakable: true,
    margin: [0, 0, 0, 10],
  };
}

/** La extensión FHIR con la que el backend guarda el motivo de una corrección (ENG-100). */
const EXTENSION_MOTIVO = 'urn:mediconnect:fhir:extension:correction-reason';

function motivoDeCorreccion(content: unknown): string | null {
  if (typeof content !== 'object' || content === null) return null;
  const extension = (content as { extension?: unknown }).extension;
  if (!Array.isArray(extension)) return null;
  const item = extension.find(
    (x): x is { url: string; valueString: string } =>
      typeof x === 'object' &&
      x !== null &&
      (x as { url?: unknown }).url === EXTENSION_MOTIVO &&
      typeof (x as { valueString?: unknown }).valueString === 'string',
  );
  return item?.valueString ?? null;
}
