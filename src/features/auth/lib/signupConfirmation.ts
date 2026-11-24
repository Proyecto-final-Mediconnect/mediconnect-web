/**
 * Qué trae la URL cuando se vuelve del enlace de confirmación del registro
 * (ENG-235). Supabase redirige acá (`emailRedirectTo` del backend) con
 * `#access_token=…&type=signup` si confirmó, o con `error_code=otp_expired` (en
 * el fragmento o en la query) si el enlace venció o ya se usó.
 */
export function confirmacionDelRegistro(
  hash: string,
  search: string,
): 'confirmada' | 'vencida' | null {
  const fragmento = new URLSearchParams(hash.replace(/^#/, ''));
  const query = new URLSearchParams(search);
  if (fragmento.get('error') || query.get('error')) return 'vencida';
  const tipo = fragmento.get('type');
  if (fragmento.get('access_token') && (tipo === 'signup' || tipo === 'email')) return 'confirmada';
  return null;
}
