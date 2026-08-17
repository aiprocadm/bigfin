import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { AppToaster } from '@/components/AppToaster';
import { API_ERROR_KEYS } from '@/constants/apiErrorKeys';

/**
 * Показывает пользователю ПРИЧИНУ ошибки запроса, а не «что-то пошло не так»
 * (С1 карты v14).
 *
 * Порядок разбора: тост о сети уже показан перехватчиком → молчим; нет ответа
 * сервера → «нет связи»; известный код из словаря (общего или локального) →
 * его текст; 403 → «недостаточно прав»; иначе — честный запасной текст.
 *
 * @param error - ошибка axios из catch/onError.
 * @param map - локальные коды экрана поверх общего словаря {@link API_ERROR_KEYS}.
 * @param fallbackKey - ключ запасного текста.
 */
export function showApiError(
  error: unknown,
  map: Record<string, string> = {},
  fallbackKey = 'something_went_wrong',
): void {
  const err = error as any;

  if (err?.isNetworkError) return;

  const show = (key: string) =>
    AppToaster.show({ message: intl.get(key), intent: Intent.DANGER });

  if (err && !err.response) {
    show('error.network');
    return;
  }
  const errors: any[] = err?.response?.data?.errors ?? [];
  const dictionary = { ...API_ERROR_KEYS, ...map };
  const known = errors.find((e) => e?.type && dictionary[e.type]);
  if (known) {
    show(dictionary[known.type]);
    return;
  }
  if (err?.response?.status === 403) {
    show('error.forbidden');
    return;
  }
  show(fallbackKey);
}
