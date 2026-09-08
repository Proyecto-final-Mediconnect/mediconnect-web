import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { TextField } from '../../../shared/ui/TextField';
import { PasswordRules } from './PasswordRules';
import { useRegisterProfessional } from '../hooks/useRegisterProfessional';
import { registerProfessionalSchema } from '../types/registerProfessional';

type FieldKey =
  | 'email'
  | 'password'
  | 'passwordConfirmation'
  | 'firstName'
  | 'lastName'
  | 'specialty'
  | 'licenseNumber';

type FieldErrors = Partial<Record<FieldKey, string>>;

export function ProfessionalRegisterForm() {
  const [values, setValues] = useState({
    email: '',
    password: '',
    passwordConfirmation: '',
    firstName: '',
    lastName: '',
    specialty: '',
    licenseNumber: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const passwordToggle = {
    passwordVisible: showPasswords,
    onTogglePasswordVisibility: () => setShowPasswords((v) => !v),
  };

  function set(field: FieldKey) {
    return (e: { target: { value: string } }) =>
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
  }

  const { mutate, isPending, isSuccess, error } = useRegisterProfessional();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = registerProfessionalSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as FieldKey;
        if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    mutate(result.data);
  }

  if (isSuccess) {
    return (
      <div
        role="status"
        className="rounded-[14px] border border-brand/30 bg-surface-teal p-7"
      >
        <div
          aria-hidden
          className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-deep text-xl text-white"
        >
          ✓
        </div>
        <h2 className="font-display mt-5 text-[26px] leading-[1.2] text-brand-deep">
          Revisá tu correo
        </h2>
        <p className="mt-2.5 text-sm leading-[1.7] text-ink">
          Te enviamos un enlace para confirmar tu cuenta.
        </p>

        {/* Los dos pasos van numerados y separados: son dos esperas distintas y
            la segunda es la que sorprende. Antes iban en un párrafo corrido y
            "validaremos tu matrícula" se leía como un trámite ya hecho. */}
        <ol className="mt-5 grid gap-3 border-t border-brand/20 pt-5">
          <Paso n={1} titulo="Confirmá tu email">
            Con el enlace que te mandamos.
          </Paso>
          <Paso n={2} titulo="Validamos tu matrícula a mano">
            Lo revisa un moderador. Hasta que lo apruebe, tu cuenta funciona pero tu perfil
            todavía no aparece en el catálogo y nadie puede reservarte.
          </Paso>
        </ol>

        <p className="mt-5 text-[13px] leading-[1.7] text-muted">
          ¿Ya tenías cuenta?{' '}
          <Link
            to="/ingresar"
            className="font-semibold text-brand-hover underline-offset-2 hover:underline"
          >
            Iniciá sesión
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex gap-4">
        <TextField
          id="firstName"
          name="firstName"
          label="Nombre"
          autoComplete="given-name"
          placeholder="Ana"
          value={values.firstName}
          onChange={set('firstName')}
          error={errors.firstName}
        />
        <TextField
          id="lastName"
          name="lastName"
          label="Apellido"
          autoComplete="family-name"
          placeholder="García"
          value={values.lastName}
          onChange={set('lastName')}
          error={errors.lastName}
        />
      </div>
      <TextField
        id="specialty"
        name="specialty"
        label="Especialidad"
        placeholder="Cardiología"
        value={values.specialty}
        onChange={set('specialty')}
        error={errors.specialty}
      />
      <TextField
        id="licenseNumber"
        name="licenseNumber"
        label="Número de matrícula"
        placeholder="MP-12345"
        value={values.licenseNumber}
        onChange={set('licenseNumber')}
        error={errors.licenseNumber}
      />
      <TextField
        id="email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="tucorreo@ejemplo.com"
        value={values.email}
        onChange={set('email')}
        error={errors.email}
      />
      <TextField
        id="password"
        name="password"
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        placeholder="Tu contraseña"
        value={values.password}
        onChange={set('password')}
        error={errors.password}
        {...passwordToggle}
      />

      <PasswordRules value={values.password} />

      <TextField
        id="passwordConfirmation"
        name="passwordConfirmation"
        label="Confirmar contraseña"
        type="password"
        autoComplete="new-password"
        placeholder="Repetí la contraseña"
        value={values.passwordConfirmation}
        onChange={set('passwordConfirmation')}
        error={errors.passwordConfirmation}
        {...passwordToggle}
      />

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error.message}
        </p>
      )}

      <Button type="submit" fullWidth disabled={isPending} className="mt-2">
        {isPending ? 'Creando cuenta…' : 'Crear cuenta profesional'}
      </Button>
    </form>
  );
}

/** Un paso de la espera posterior al alta. */
function Paso({
  n,
  titulo,
  children,
}: {
  n: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-white text-[11px] font-bold text-brand-deep"
      >
        {n}
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-bold text-brand-deep">{titulo}</span>
        <span className="mt-1 block text-[13px] leading-[1.6] text-muted">{children}</span>
      </span>
    </li>
  );
}
