// © 2026 Bigfin

/**
 * Показывать ли Swagger UI на `/api/docs` (этап 15 ТЗ).
 *
 * ТЗ: «закрыть для production за флагом». Флаг сделан так, что **молчание
 * означает закрыто**: чтобы открыть документацию на бою, нужно осознанное
 * действие человека, а не забытая настройка.
 *
 * Обратное правило («открыто, пока не выключили») однажды выставило бы наружу
 * полный список ручек боевого сервера просто потому, что при разворачивании
 * забыли дописать переменную.
 */
export function isApiDocsEnabled(
  env?: Record<string, string | undefined>,
): boolean {
  // Окружение спрашивается ВНУТРИ функции, а не в значении параметра по
  // умолчанию: `.env` читается уже во время запуска приложения, и всё, что
  // спросило раньше, получило бы пустоту. За этим следит
  // `common/config/settingsReadOnLoadGuard.spec.ts`.
  const source = env ?? process.env;
  const flag = String(source.API_DOCS_ENABLED ?? '').trim().toLowerCase();

  // Явный запрет сильнее всего: им выключают документацию и на разработке.
  if (flag === 'false' || flag === '0' || flag === 'no') return false;
  if (flag === 'true' || flag === '1' || flag === 'yes') return true;

  // Флага нет. Вне production документация нужна всегда — без неё разработчик
  // не увидит собственных ручек. На бою — закрыто.
  return String(source.NODE_ENV ?? '').trim().toLowerCase() !== 'production';
}
