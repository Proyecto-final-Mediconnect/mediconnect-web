import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { isUnauthorized } from '../api/apiError';
import { compressImage } from '../lib/compressImage';
import {
  useMyProfile,
  useSpecialties,
  useUpdateProfile,
  useUploadPhoto,
} from '../hooks/useProfile';
import { professionalProfileSchema } from '../types/professionalProfile';
import { ProfilePreview } from './ProfilePreview';

const MAX_SPECIALTIES = 3;
const MAX_BIO = 500;

/**
 * Tope ANTES de comprimir. `createImageBitmap` decodifica la imagen entera en
 * memoria, así que un archivo de 50 MB se decodificaba completo antes de que
 * alguien mirara su tamaño. La foto comprimida termina pesando muy poco: esto es
 * solo el freno de entrada.
 */
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

type FieldErrors = Partial<
  Record<'bio' | 'consultationPrice' | 'specialtyIds', string>
>;

export function ProfessionalProfileForm() {
  const {
    data: profile,
    isPending,
    isError,
    error,
  } = useMyProfile();
  const { data: specialties = [] } = useSpecialties();
  const updateProfile = useUpdateProfile();
  const uploadPhoto = useUploadPhoto();

  const [bio, setBio] = useState('');
  const [price, setPrice] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const seeded = useRef(false);

  /**
   * Lo último que quedó guardado, para saber si hay cambios sin guardar.
   *
   * Es estado y no un ref porque se LEE al renderizar —la barra del pie compara
   * contra esto en cada tecla—, y un ref leído en el render es justo lo que React
   * desaconseja.
   */
  const [original, setOriginal] = useState<{
    bio: string;
    price: string;
    specialtyIds: string[];
  }>({ bio: '', price: '', specialtyIds: [] });

  // Sembramos el formulario una sola vez cuando llega el perfil, para no pisar
  // ediciones sin guardar (ej. al subir la foto, que también refresca el perfil).
  useEffect(() => {
    if (profile && !seeded.current) {
      setBio(profile.bio ?? '');
      setPrice(
        profile.consultationPrice !== null
          ? String(profile.consultationPrice)
          : '',
      );
      const ids = profile.specialties.map((s) => s.id);
      setSelectedIds(ids);
      setOriginal({
        bio: profile.bio ?? '',
        price:
          profile.consultationPrice !== null ? String(profile.consultationPrice) : '',
        specialtyIds: ids,
      });
      seeded.current = true;
    }
  }, [profile]);

  // Sesión vencida o ausente: la página no tiene nada que mostrar, va al login.
  // TODO(ENG-44): cuando esté el <RequireAuth> compartido (mediconnect-web#11),
  // la ruta /perfil se envuelve con él y esto se puede borrar.
  if (isError && isUnauthorized(error)) {
    return <Navigate to="/ingresar" replace />;
  }
  // `isError` y "todavía no hay datos" son estados distintos: mezclarlos hacía que
  // un refetch en curso (pending pero no fetching, con error en null) cayera en la
  // rama de error y mostrara el literal genérico en vez del mensaje del backend.
  if (isError) {
    return (
      <p role="alert" className="text-danger">
        {error instanceof Error ? error.message : 'No se pudo cargar tu perfil.'}
      </p>
    );
  }
  if (isPending || !profile) {
    return <p className="text-muted">Cargando tu perfil…</p>;
  }

  function toggleSpecialty(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= MAX_SPECIALTIES) return prev;
      return [...prev, id];
    });
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-elegir la misma foto
    if (!file) return;
    if (file.size > MAX_INPUT_BYTES) {
      setPhotoError('Elegí una imagen de menos de 12 MB.');
      return;
    }
    setPhotoError(null);
    const compressed = await compressImage(file);
    uploadPhoto.mutate(compressed);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);

    const trimmedPrice = price.trim();
    const priceValue = trimmedPrice === '' ? null : Number(trimmedPrice);
    if (priceValue !== null && Number.isNaN(priceValue)) {
      setErrors({ consultationPrice: 'Ingresá un precio válido' });
      return;
    }

    const parsed = professionalProfileSchema.safeParse({
      bio,
      consultationPrice: priceValue,
      specialtyIds: selectedIds,
    });

    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    updateProfile.mutate(parsed.data, {
      onSuccess: () => {
        setSaved(true);
        // El nuevo punto de comparación es lo que había en el formulario al
        // enviar, no lo que devuelve el backend: el precio viaja como número y
        // en el campo es un string, así que comparar contra la respuesta dejaría
        // el formulario "sucio" para siempre después de guardar.
        setOriginal({ bio, price, specialtyIds: selectedIds });
      },
    });
  }

  const selectedSpecialties = specialties.filter((s) =>
    selectedIds.includes(s.id),
  );
  const priceNumber = price.trim() === '' ? null : Number(price);

  const sucio =
    bio !== original.bio ||
    price !== original.price ||
    selectedIds.join(',') !== original.specialtyIds.join(',');

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <form onSubmit={handleSubmit} noValidate className="grid gap-5">
        <Seccion
          titulo="Tu foto y tu presentación"
          detalle="Es lo primero que ve un paciente al abrir tu perfil en el catálogo."
        >
          <div className="flex flex-wrap items-center gap-5">
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt="Tu foto de perfil"
                className="h-20 w-20 flex-none rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 flex-none items-center justify-center rounded-full bg-surface-teal text-xl font-bold text-brand-deep">
                {`${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase()}
              </div>
            )}
            <div>
              <label
                htmlFor="photo"
                className="inline-flex cursor-pointer items-center rounded-[9px] border border-line-strong bg-white px-4 py-2.5 text-[13px] font-bold text-brand-deep transition-colors hover:border-brand"
              >
                {uploadPhoto.isPending ? 'Subiendo…' : 'Cambiar foto'}
              </label>
              <input
                id="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handlePhotoChange}
                disabled={uploadPhoto.isPending}
              />
              <p className="mt-1.5 text-[12px] text-muted-soft">JPG, PNG o WEBP.</p>
              {(photoError !== null || uploadPhoto.isError) && (
                <p role="alert" className="mt-1.5 text-[13px] text-danger">
                  {photoError ??
                    (uploadPhoto.error instanceof Error
                      ? uploadPhoto.error.message
                      : 'No se pudo subir la foto.')}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-1.5">
            <label htmlFor="bio" className="text-sm font-semibold text-ink">
              Biografía
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={MAX_BIO}
              rows={6}
              placeholder="Contales a tus pacientes sobre tu experiencia, enfoque y formación."
              aria-invalid={!!errors.bio}
              className={`w-full resize-y rounded-[10px] border bg-white px-4 py-3 text-sm leading-[1.6] text-ink outline-none transition-colors placeholder:text-muted-soft focus:border-brand focus-visible:ring-2 focus-visible:ring-brand ${
                errors.bio ? 'border-danger' : 'border-line-strong'
              }`}
            />
            <div className="flex justify-between gap-3">
              {errors.bio ? <p className="text-[13px] text-danger">{errors.bio}</p> : <span />}
              {/* aria-live: un lector de pantalla tiene que enterarse de que se
                  está acercando al límite, no solo verlo. */}
              <span className="text-[12px] text-muted-soft" aria-live="polite">
                {bio.length}/{MAX_BIO} caracteres
              </span>
            </div>
          </div>
        </Seccion>

        <Seccion
          titulo="Especialidades"
          detalle={`Hasta ${MAX_SPECIALTIES}. Son el filtro con el que los pacientes buscan en el catálogo.`}
        >
          <fieldset className="grid gap-3">
            <legend className="sr-only">
              Especialidades (elegí hasta {MAX_SPECIALTIES})
            </legend>
            <div className="flex flex-wrap gap-2">
              {specialties.map((s) => {
                const active = selectedIds.includes(s.id);
                const disabled = !active && selectedIds.length >= MAX_SPECIALTIES;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSpecialty(s.id)}
                    disabled={disabled}
                    aria-pressed={active}
                    className={`rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      active
                        ? // Azul profundo y no teal: el blanco sobre #14b8a6 da
                          // 2.2:1, por debajo del mínimo de WCAG AA.
                          'border-brand-deep bg-brand-deep text-white'
                        : 'border-line-strong bg-white text-brand-deep hover:border-brand disabled:cursor-not-allowed disabled:opacity-40'
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
            <p className="text-[12px] text-muted-soft">
              {selectedIds.length} de {MAX_SPECIALTIES} elegidas
            </p>
            {errors.specialtyIds && (
              <p className="text-[13px] text-danger">{errors.specialtyIds}</p>
            )}
          </fieldset>
        </Seccion>

        <Seccion
          titulo="Precio de consulta"
          detalle="Sin precio publicado, el botón de reservar te aparece deshabilitado en el catálogo."
        >
          <div className="grid max-w-[280px] gap-1.5">
            <label htmlFor="price" className="text-sm font-semibold text-ink">
              Precio de consulta (ARS)
            </label>
            <input
              id="price"
              type="number"
              min={0}
              step={100}
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="15000"
              aria-invalid={!!errors.consultationPrice}
              className={`w-full rounded-[10px] border bg-white px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted-soft focus:border-brand focus-visible:ring-2 focus-visible:ring-brand ${
                errors.consultationPrice ? 'border-danger' : 'border-line-strong'
              }`}
            />
            {errors.consultationPrice && (
              <p className="text-[13px] text-danger">{errors.consultationPrice}</p>
            )}
          </div>
        </Seccion>

        {updateProfile.isError && (
          <p
            role="alert"
            className="rounded-[10px] border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
          >
            {updateProfile.error instanceof Error
              ? updateProfile.error.message
              : 'No se pudo guardar tu perfil.'}
          </p>
        )}

        <div className="sticky bottom-0 rounded-[14px] border border-line bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-[13px] text-muted">
              {saved && !sucio ? (
                <span role="status" className="font-semibold text-brand-hover">
                  Perfil guardado ✓
                </span>
              ) : sucio ? (
                'Tenés cambios sin guardar.'
              ) : (
                'Todo al día.'
              )}
            </p>

            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="rounded-[9px] bg-brand-deep px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updateProfile.isPending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </form>

      <aside className="grid gap-4 xl:sticky xl:top-24">
        <EstadoMatricula status={profile.status} licenseNumber={profile.licenseNumber} />

        <ProfilePreview
          firstName={profile.firstName}
          lastName={profile.lastName}
          photoUrl={profile.photoUrl}
          bio={bio}
          specialties={selectedSpecialties}
          consultationPrice={priceNumber}
          currency={profile.currency}
        />
      </aside>
    </div>
  );
}

/** Bloque del formulario: un título, para qué sirve, y sus campos. */
function Seccion({
  titulo,
  detalle,
  children,
}: {
  titulo: string;
  detalle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[14px] border border-line bg-white">
      <header className="border-b border-line-soft px-6 py-[18px]">
        <h2 className="text-[17px] font-bold text-brand-deep">{titulo}</h2>
        <p className="mt-1.5 max-w-[560px] text-[13px] leading-[1.6] text-muted">{detalle}</p>
      </header>
      <div className="px-6 py-6">{children}</div>
    </section>
  );
}

/**
 * Estado de la matrícula.
 *
 * Es el dato más importante de esta pantalla y no estaba: mientras el estado no
 * sea VALIDADO el perfil **no aparece en el catálogo** —tanto `catalog.service`
 * como `public-professionals.service` filtran por ese estado—, así que se puede
 * completar todo el formulario y no cambiar nada. Se dice acá, al lado de lo que
 * se está editando, y no solo en el panel.
 */
function EstadoMatricula({
  status,
  licenseNumber,
}: {
  status: string;
  licenseNumber: string;
}) {
  const validado = status === 'VALIDADO';

  const texto: Record<string, string> = {
    VALIDADO: 'Tu perfil aparece en el catálogo y los pacientes pueden reservarte.',
    PENDIENTE_VALIDACION_MATRICULA:
      'Un moderador la revisa a mano. Hasta que la aprueben, tu perfil no aparece en el catálogo.',
    RECHAZADO: 'Tu perfil no aparece en el catálogo. Escribinos para revisar el caso.',
    SUSPENDIDO: 'Tu cuenta está suspendida: no aparecés en el catálogo ni recibís turnos.',
  };

  return (
    <section
      aria-labelledby="matricula"
      className={`overflow-hidden rounded-[14px] border ${
        validado ? 'border-line bg-white' : 'border-danger/35 bg-danger/[0.04]'
      }`}
    >
      <header className="px-5 py-[18px]">
        <h2
          id="matricula"
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
        >
          Matrícula
        </h2>
        <p
          className={`mt-2 flex items-center gap-2 text-[15px] font-bold ${
            validado ? 'text-brand-hover' : 'text-danger'
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              validado ? 'bg-brand' : 'bg-danger'
            }`}
          />
          {validado ? 'Verificada' : 'En validación'}
        </p>
        <p className="mt-2 text-[13px] leading-[1.6] text-muted">
          {texto[status] ?? 'Estado desconocido.'}
        </p>
        <p className="mt-3 font-mono text-[12px] text-muted-soft">{licenseNumber}</p>
      </header>
    </section>
  );
}
