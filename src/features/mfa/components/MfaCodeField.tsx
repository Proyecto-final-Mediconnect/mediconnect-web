/**
 * El campo del código de seis dígitos de la app autenticadora (ENG-88).
 *
 * `one-time-code` deja que el navegador o el gestor de contraseñas lo
 * complete solo, y `numeric` abre el teclado de números en el celular. Lo que
 * no es un dígito se descarta al tipear o al pegar ("123 456" → "123456").
 */
export function MfaCodeField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-brand-deep">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="123456"
        disabled={disabled}
        autoFocus
        className="w-full max-w-[220px] rounded-[10px] border border-line-strong px-3.5 py-2.5 text-center font-mono text-[22px] tracking-[0.4em] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
      />
    </div>
  );
}
