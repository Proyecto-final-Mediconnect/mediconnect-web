import { CatalogView } from '../features/catalog/components/CatalogView';
import { PUBLIC_SHELL, PublicHeader } from '../shared/ui/PublicHeader';

/**
 * Catálogo público (ENG-49), con el diseño del canvas.
 *
 * Es una ruta abierta: no la envuelve ningún guard de sesión y **no dispara
 * `GET /me`**. Esa propiedad se mantiene a propósito, y es la razón de que el
 * catálogo dentro de la app sea otra ruta (`/buscar`) en vez de esta misma
 * decidiendo el marco según haya sesión: para elegir el marco habría que
 * preguntar quién sos, y eso es justo lo que esta página no hace.
 *
 * El contenido —filtros, buscador y resultados— vive en `CatalogView`, que
 * comparte con la versión de adentro de la app.
 */
export function CatalogPage() {
  return (
    <div className="min-h-svh bg-surface">
      <PublicHeader />

      <main className={`${PUBLIC_SHELL} pb-[88px] pt-10`}>
        <h1 className="font-display text-[32px] leading-[1.1] text-brand-deep lg:text-[40px]">
          Buscar profesionales
        </h1>
        <p className="mb-[26px] mt-3 max-w-[640px] text-[15px] leading-[1.65] text-muted">
          Todos los profesionales del catálogo tienen la matrícula verificada. Filtrá por
          especialidad y precio para encontrar el que se adapte a lo que necesitás.
        </p>

        <CatalogView basePath="/profesionales" />
      </main>
    </div>
  );
}
