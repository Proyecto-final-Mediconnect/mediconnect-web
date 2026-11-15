/** `https://x.daily.co/sala?t=TOKEN` → la URL de la sala y el token, por separado. */
export function splitRoomUrl(roomUrl: string): { url: string; token?: string } {
  const parsed = new URL(roomUrl);
  const token = parsed.searchParams.get('t') ?? undefined;
  parsed.searchParams.delete('t');
  return { url: parsed.toString(), token };
}
