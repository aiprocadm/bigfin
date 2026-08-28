// © 2026 Bigfin

/** Метка, которой сервер помечает отказ из-за выключенного модуля. */
export const FEATURE_DISABLED = 'FEATURE_DISABLED';

/**
 * П1 карты v36. Отличает «модуль выключен» от «нет прав».
 *
 * Оба случая приходят кодом 403. Раньше витрина на любой 403 показывала
 * красную плашку «У вас нет прав на доступ к этой странице» — и на
 * выключенном разделе это была неправда: права ни при чём, модуль
 * включается в настройках, а сам экран уже это объясняет.
 */
export function isFeatureDisabledResponse(data: any): boolean {
  const errors = Array.isArray(data?.errors) ? data.errors : [];

  return errors.some((error: any) => error?.type === FEATURE_DISABLED);
}
