import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
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
      setSelectedIds(profile.specialties.map((s) => s.id));
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
    updateProfile.mutate(parsed.data, { onSuccess: () => setSaved(true) });
  }

  const selectedSpecialties = specialties.filter((s) =>
    selectedIds.includes(s.id),
  );
  const priceNumber = price.trim() === '' ? null : Number(price);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        {/* Foto */}
        <div className="flex items-center gap-4">
          {profile.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt="Tu foto de perfil"
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-teal text-xl font-semibold text-brand">
              {`${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase()}
            </div>
          )}
          <div>
            <label
              htmlFor="photo"
              className="inline-flex cursor-pointer items-center rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/5"
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
            <p className="mt-1 text-xs text-muted">JPG, PNG o WEBP.</p>
            {(photoError !== null || uploadPhoto.isError) && (
              <p role="alert" className="mt-1 text-sm text-danger">
                {photoError ??
                  (uploadPhoto.error instanceof Error
                    ? uploadPhoto.error.message
                    : 'No se pudo subir la foto.')}
              </p>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-1.5 text-left">
          <label htmlFor="bio" className="text-sm font-medium text-ink">
            Biografía
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={MAX_BIO}
            rows={5}
            placeholder="Contales a tus pacientes sobre tu experiencia, enfoque y formación."
            aria-invalid={!!errors.bio}
            className={`w-full resize-y rounded-lg border px-3.5 py-2.5 text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-brand focus:ring-2 focus:ring-brand/30 ${
              errors.bio ? 'border-danger' : 'border-slate-300'
            }`}
          />
          <div className="flex justify-between">
            {errors.bio ? (
              <p className="text-sm text-danger">{errors.bio}</p>
            ) : (
              <span />
            )}
            {/* aria-live: un lector de pantalla tiene que enterarse de que se está
                acercando al límite, no solo verlo. */}
            <span className="text-xs text-muted" aria-live="polite">
              {bio.length}/{MAX_BIO} caracteres
            </span>
          </div>
        </div>

        {/* Especialidades */}
        <fieldset className="flex flex-col gap-2 text-left">
          <legend className="text-sm font-medium text-ink">
            Especialidades{' '}
            <span className="font-normal text-muted">
              (elegí hasta {MAX_SPECIALTIES}) · {selectedIds.length}/
              {MAX_SPECIALTIES}
            </span>
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
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? 'border-brand bg-brand text-white'
                      : 'border-slate-300 text-ink hover:border-brand disabled:cursor-not-allowed disabled:opacity-40'
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
          {errors.specialtyIds && (
            <p className="text-sm text-danger">{errors.specialtyIds}</p>
          )}
        </fieldset>

        {/* Precio */}
        <div className="flex flex-col gap-1.5 text-left">
          <label htmlFor="price" className="text-sm font-medium text-ink">
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
            className={`w-full rounded-lg border px-3.5 py-2.5 text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-brand focus:ring-2 focus:ring-brand/30 ${
              errors.consultationPrice ? 'border-danger' : 'border-slate-300'
            }`}
          />
          {errors.consultationPrice && (
            <p className="text-sm text-danger">{errors.consultationPrice}</p>
          )}
        </div>

        {updateProfile.isError && (
          <p role="alert" className="text-sm text-danger">
            {updateProfile.error instanceof Error
              ? updateProfile.error.message
              : 'No se pudo guardar tu perfil.'}
          </p>
        )}
        {saved && !updateProfile.isPending && (
          <p role="status" className="text-sm font-medium text-brand">
            Perfil guardado ✓
          </p>
        )}

        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </form>

      <ProfilePreview
        firstName={profile.firstName}
        lastName={profile.lastName}
        photoUrl={profile.photoUrl}
        bio={bio}
        specialties={selectedSpecialties}
        consultationPrice={priceNumber}
        currency={profile.currency}
      />
    </div>
  );
}
