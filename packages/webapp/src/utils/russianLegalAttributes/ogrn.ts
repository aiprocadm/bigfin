/**
 * Валидация ОГРН (Основной государственный регистрационный номер).
 * 13 цифр. Последняя — контрольная: первые 12 цифр % 11, mod 10.
 */
export function isValidOgrn(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (!/^\d{13}$/.test(value)) return false;

  const first12 = value.slice(0, 12);
  const checksum = (parseInt(first12, 10) % 11) % 10;
  return checksum === parseInt(value[12], 10);
}
