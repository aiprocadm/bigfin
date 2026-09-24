// © 2026 Bigfin

/** Метка отказа AI CFO: для ответа нужен отчёт, которого человек не видит. */
export const AI_CFO_NO_ACCESS = 'AI_CFO_NO_ACCESS';

/**
 * Отличает «AI CFO не может ответить на ЭТОТ вопрос» от «нет прав на экран».
 *
 * Оба случая приходят кодом 403. Но AI CFO собирает ответ из отчётов с
 * правами самого человека, и отказ по одному вопросу (например, сотрудник
 * без доступа к ОПиУ спросил про прибыль) не повод закрывать весь экран
 * плашкой «нет доступа»: остальные вопросы у него работают. Поэтому такой
 * отказ показывается строкой, а экран остаётся на месте.
 */
export function isAiCfoNoAccessResponse(data: any): boolean {
  const errors = Array.isArray(data?.errors) ? data.errors : [];

  return errors.some((error: any) => error?.type === AI_CFO_NO_ACCESS);
}
