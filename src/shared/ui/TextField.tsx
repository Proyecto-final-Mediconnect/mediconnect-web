import { useState, type InputHTMLAttributes } from 'react';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  /** Visibilidad controlada desde el padre (para sincronizar varios campos). */
  passwordVisible?: boolean;
  onTogglePasswordVisibility?: () => void;
};

export function TextField({
  id,
  label,
  error,
  type,
  passwordVisible,
  onTogglePasswordVisibility,
  ...props
}: TextFieldProps) {
  const [internalVisible, setInternalVisible] = useState(false);
  const isPassword = type === 'password';
  const controlled = passwordVisible !== undefined;
  const visible = controlled ? passwordVisible : internalVisible;
  const toggleVisible = () =>
    controlled ? onTogglePasswordVisibility?.() : setInternalVisible((v) => !v);
  const inputType = isPassword && visible ? 'text' : type;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          aria-invalid={!!error}
          aria-describedby={errorId}
          className={`w-full rounded-lg border px-3.5 py-2.5 text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-brand focus:ring-2 focus:ring-brand/30 ${
            isPassword ? 'pr-11' : ''
          } ${error ? 'border-danger' : 'border-slate-300'}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={toggleVisible}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
            title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted transition-colors hover:text-brand focus:outline-none focus-visible:text-brand"
          >
            {visible ? <EyeIcon /> : <EyeOffIcon />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      width={20}
      height={20}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.964 7.178.07.207.07.43 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      width={20}
      height={20}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.774 3.162 10.066 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.243 4.243L9.88 9.88"
      />
    </svg>
  );
}
