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

  // Значения из `payload` подставляются в текст: без них сообщения вроде
  // «строк больше предела» остаются без единого ориентира (М3 карты v15).
  const show = (key: string, values?: Record<string, any>) =>
    AppToaster.show({
      message: intl.get(key, values),
      intent: Intent.DANGER,
    });

  if (err && !err.response) {
    show('error.network');
    return;
  }
  // Выгрузка и PDF просят файл, поэтому и отказ сервера приезжает файлом.
  // Без разбора человек видел бы вечный «идёт загрузка» (М3 карты v15).
  const body = err?.response?.data;

  if (body && typeof body.text === 'function') {
    body
      .text()
      .then((text: string) => {
        let parsed: any = null;

        try {
          parsed = JSON.parse(text);
        } catch {
          // Не JSON — покажем честный запасной текст ниже.
        }
        showApiError(
          { ...err, response: { ...err.response, data: parsed ?? {} } },
          map,
          fallbackKey,
        );
      })
      .catch(() => show(fallbackKey));
    return;
  }
  const errors: any[] = err?.response?.data?.errors ?? [];
  const dictionary = { ...API_ERROR_KEYS, ...map };
  const known = errors.find((e) => e?.type && dictionary[e.type]);
  if (known) {
    show(dictionary[known.type], known.payload);
    return;
  }
  if (err?.response?.status === 403) {
    show('error.forbidden');
    return;
  }
  show(fallbackKey);
}
