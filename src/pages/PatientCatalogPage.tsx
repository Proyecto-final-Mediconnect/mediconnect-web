import { CatalogView } from '../features/catalog/components/CatalogView';
import { DashboardLayout } from './DashboardLayout';

/**
 * El catálogo dentro de la app.
 *
 * Mismo catálogo que `/profesionales`, otro marco: el de alguien que ya tiene
 * sesión y llegó desde el menú lateral. Antes ese ítem llevaba a la página
 * pública, así que el paciente salía de la app —perdía la barra lateral, y el
 * encabezado le ofrecía "Ingresar" y "Crear cuenta" estando logueado.
 *
 * Es una ruta aparte y no la misma decidiendo el marco porque el catálogo público
 * no pide la sesión a propósito, y para elegir marco habría que pedirla.
 */
export function PatientCatalogPage() {
  return (
    <DashboardLayout
      barTitle="Buscar profesionales"
      subtitle="Todos los profesionales del catálogo tienen la matrícula verificada. Filtrá por especialidad y precio para encontrar el que se adapte a lo que necesitás."
    >
      <CatalogView basePath="/buscar" />
    </DashboardLayout>
  );
}
