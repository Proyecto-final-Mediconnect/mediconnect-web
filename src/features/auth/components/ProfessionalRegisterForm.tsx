import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { TextField } from '../../../shared/ui/TextField';
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
        className="rounded-xl border border-brand/30 bg-surface-teal p-6 text-center"
      >
        <div
          aria-hidden
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-2xl text-white"
        >
          ✓
        </div>
        <h2 className="mb-2 text-xl font-semibold text-brand-deep">
          Revisá tu correo
        </h2>
        <p className="text-muted">
          Te enviamos un enlace para confirmar tu cuenta. Una vez verificada,
          nuestro equipo validará tu matrícula antes de habilitar tu perfil
          profesional. Si ya tenías una cuenta, podés{' '}
          <Link
            to="/ingresar"
            className="font-semibold text-brand hover:underline"
          >
            iniciar sesión
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
        placeholder="Mínimo 8 caracteres"
        value={values.password}
        onChange={set('password')}
        error={errors.password}
        {...passwordToggle}
      />
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
