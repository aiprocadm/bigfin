/**
 * Валидация ОГРНИП (ОГРН индивидуального предпринимателя).
 * 15 цифр. Последняя — контрольная: первые 14 цифр % 13, mod 10.
 */
export function isValidOgrnip(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (!/^\d{15}$/.test(value)) return false;

  const first14 = value.slice(0, 14);
  const checksum = (parseInt(first14, 10) % 13) % 10;
  return checksum === parseInt(value[14], 10);
}
