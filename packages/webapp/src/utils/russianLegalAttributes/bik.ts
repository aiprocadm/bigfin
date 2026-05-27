/**
 * Валидация БИК (Банковский идентификационный код).
 * 9 цифр. Для российских банков всегда начинается с '04'.
 * Контрольная сумма по справочнику ЦБ — на старте не проверяем.
 */
export function isValidBik(value: string): boolean {
  if (typeof value !== 'string') return false;
  return /^04\d{7}$/.test(value);
}
