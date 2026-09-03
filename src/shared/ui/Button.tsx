import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
};

const base =
  'inline-flex items-center justify-center gap-2 rounded-[9px] px-5 py-3 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';

// `primary` usa el azul profundo y no el teal: en el diseño el teal es el CTA
// sobre fondo oscuro, y sobre blanco no rinde. Además el blanco sobre #14b8a6
// daba 2.2:1 de contraste, por debajo del mínimo de WCAG AA para texto.
const variants = {
  primary: 'bg-brand-deep text-white hover:bg-night',
  secondary: 'border border-line-strong bg-white text-brand-deep hover:border-brand',
  ghost: 'text-brand-deep hover:bg-surface-teal',
};

export function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    />
  );
}
