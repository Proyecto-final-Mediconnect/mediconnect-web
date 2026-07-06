type LogoProps = {
  tone?: 'dark' | 'light';
  showText?: boolean;
  className?: string;
};

/** Logo de MediConnect: corazón con línea de pulso + wordmark. */
export function Logo({
  tone = 'dark',
  showText = true,
  className = '',
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img src="/logo.png" alt="MediConnect" className="h-9 w-9" />
      {showText && (
        <span
          className={`text-xl font-bold tracking-tight ${
            tone === 'light' ? 'text-white' : 'text-brand-deep'
          }`}
        >
          MediConnect
        </span>
      )}
    </span>
  );
}
