import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { isUnauthorized } from '../../profile/api/apiError';
import { Button } from '../../../shared/ui/Button';
import { TextField } from '../../../shared/ui/TextField';
import { useMyProfile, useUpdateProfile } from '../hooks/usePatientProfile';
import { patientProfileSchema } from '../types/patientProfile';

type FieldName = 'firstName' | 'lastName' | 'birthDate' | 'dni' | 'phone';
type FieldErrors = Partial<Record<FieldName, string>>;

export function PatientProfileForm() {
  const { data: profile, isPending, isError, error } = useMyProfile();
  const updateProfile = useUpdateProfile();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);
  const seeded = useRef(false);

  // Sembramos el formulario una sola vez cuando llega el perfil, para no pisar
  // lo que el paciente esté escribiendo si la query se refresca.
  useEffect(() => {
    if (profile && !seeded.current) {
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
      setBirthDate(profile.birthDate ?? '');
      setDni(profile.dni ?? '');
      setPhone(profile.phone ?? '');
      seeded.current = true;
    }
  }, [profile]);

  // Sesión vencida o ausente: la página no tiene nada que mostrar, va al login.
  // TODO(ENG-44): cuando esté el <RequireAuth> compartido (mediconnect-web#11),
  // la ruta /perfil/paciente se envuelve con él y esto se puede borrar.
  if (isError && isUnauthorized(error)) {
    return <Navigate to="/ingresar" replace />;
  }
  // `isError` y "todavía no hay datos" son estados distintos: mezclarlos hace que
  // un refetch en curso caiga en la rama de error y muestre el literal genérico
  // en vez del mensaje del backend.
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);

    const parsed = patientProfileSchema.safeParse({
      firstName,
      lastName,
      birthDate,
      dni,
      phone,
    });

    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as FieldName;
        if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    updateProfile.mutate(parsed.data, { onSuccess: () => setSaved(true) });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {!profile.completed && (
        <p className="rounded-lg bg-surface-teal px-4 py-3 text-sm text-brand-deep">
          Todavía no completaste tu perfil. Cargá tus datos para que los profesionales puedan
          atenderte.
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="firstName"
          label="Nombre"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          error={errors.firstName}
          autoComplete="given-name"
          maxLength={80}
        />
        <TextField
          id="lastName"
          label="Apellido"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          error={errors.lastName}
          autoComplete="family-name"
          maxLength={80}
        />
      </div>

      <TextField
        id="birthDate"
        label="Fecha de nacimiento"
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        error={errors.birthDate}
        max={new Date().toISOString().slice(0, 10)}
        autoComplete="bday"
      />

      <TextField
        id="dni"
        label="DNI"
        value={dni}
        onChange={(e) => setDni(e.target.value)}
        error={errors.dni}
        inputMode="numeric"
        placeholder="12345678"
      />

      <TextField
        id="phone"
        label="Teléfono"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={errors.phone}
        inputMode="tel"
        autoComplete="tel"
        placeholder="+54 11 5555-5555"
      />

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
  );
}
