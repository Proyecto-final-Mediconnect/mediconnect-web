import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isUnauthorized } from '../../profile/api/apiError';
import { TextField } from '../../../shared/ui/TextField';
import { useMyProfile, useUpdateProfile } from '../hooks/usePatientProfile';
import { patientProfileSchema } from '../types/patientProfile';

/**
 * Perfil del paciente (ENG-47).
 *
 * Los campos se agrupan por para qué sirven —quién sos y cómo te contactamos— en
 * vez de ir en una columna corrida de cinco. Son pocos, pero no significan lo
 * mismo: el DNI es lo que ata cada asiento de la historia clínica a una persona, y
 * eso se dice donde se pide.
 *
 * La barra de guardado va pegada al pie y avisa cuando hay cambios sin guardar. En
 * un formulario que se abre para corregir un dato suelto, el botón al final de la
 * página obliga a bajar a buscarlo, y no queda claro si algo quedó tocado.
 */

type FieldName = 'firstName' | 'lastName' | 'birthDate' | 'dni' | 'phone';
type FieldErrors = Partial<Record<FieldName, string>>;

export function PatientProfileForm() {
  const { data: profile, isPending, isError, error } = useMyProfile();
  const updateProfile = useUpdateProfile();
  /**
   * Lo último que quedó guardado, para saber si hay cambios sin guardar.
   *
   * Es estado y no un ref porque se LEE al renderizar —la barra del pie compara
   * contra esto en cada tecla—, y un ref leído en el render es justo lo que React
   * desaconseja.
   */
  const [original, setOriginal] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    dni: '',
    phone: '',
  });

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
      setOriginal({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        birthDate: profile.birthDate ?? '',
        dni: profile.dni ?? '',
        phone: profile.phone ?? '',
      });
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
    updateProfile.mutate(parsed.data, {
      onSuccess: () => {
        setSaved(true);
        // El nuevo punto de comparación es lo que había EN EL FORMULARIO al
        // enviar, no lo que devuelve el backend: el DNI se guarda normalizado
        // ("12345678") y en el campo puede haber quedado con puntos, así que
        // comparar contra la respuesta dejaría el formulario "sucio" para
        // siempre después de guardar.
        setOriginal({ firstName, lastName, birthDate, dni, phone });
      },
    });
  }

  const actual = { firstName, lastName, birthDate, dni, phone };
  const sucio = (Object.keys(actual) as (keyof typeof actual)[]).some(
    (k) => actual[k] !== original[k],
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      {!profile.completed && (
        <p className="rounded-[14px] border border-brand/30 bg-surface-teal px-5 py-4 text-[13px] leading-[1.7] text-brand-deep">
          <strong className="font-bold">Todavía no completaste tu perfil.</strong> Cargá tus
          datos para que los profesionales puedan atenderte: sin esto no vas a poder reservar
          un turno.
        </p>
      )}

      <Seccion
        titulo="Quién sos"
        detalle="Es lo que ve el profesional al abrir tu ficha, y lo que identifica cada registro de tu historia clínica."
      >
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
        </div>
        <p className="mt-4 text-[12px] leading-[1.6] text-muted-soft">
          Podés escribir el DNI con puntos: se guardan solo los números.
        </p>
      </Seccion>

      <Seccion
        titulo="Cómo te contactamos"
        detalle="Para avisarte de tus turnos y de los cambios en tu agenda."
      >
        {/* El email vive en la columna de la cuenta, no acá: no es un campo, es
            la identidad con la que entrás y no se edita desde este formulario. */}
        <div className="grid gap-5 sm:grid-cols-2">
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

      {/* Pegada al pie: el formulario se abre para corregir un dato suelto, y con
          el botón al final hay que bajar a buscarlo. */}
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
  children: ReactNode;
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
