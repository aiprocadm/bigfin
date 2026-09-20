/**
 * Личные настройки вида (FIN-026 ТЗ-2).
 *
 * НАЙДЕНО СВЕРКОЙ ЗАДЕЛА. Экран настроек сохранял галочку «отображать
 * копейки», сервер её хранил — и НИКТО её не читал. Человек снимал галочку,
 * нажимал «Сохранить», получал «сохранено» и не видел ни одного изменения.
 * Приёмка FIN-026 требует прямо: «отключение копеек меняет печать сумм во
 * всём продукте».
 *
 * ПОЧЕМУ МОДУЛЬ, А НЕ ХУК. Деньги печатает `formatOrganizationMoney` —
 * обычная функция, которую зовут из помощников, а не из компонентов: хук
 * там вызвать нельзя. Тот же приём уже применён для валюты организации,
 * которую эта функция берёт из хранилища напрямую.
 *
 * ЗНАЧЕНИЯ ПО УМОЛЧАНИЮ — «КАК БЫЛО». Пока настройки не загружены (или
 * загрузка не удалась), продукт печатает копейки: отсутствие настройки это
 * не «выключено», а «человек ничего не выбирал».
 */
export interface DisplayPreferences {
  /** Печатать ли копейки в суммах. */
  showCents: boolean;
  /** Показывать ли прошедшие кассовые разрывы в шапке. */
  showPastGaps: boolean;
  /** Показывать ли подсказки-вопросы. */
  showHints: boolean;
}

const DEFAULTS: DisplayPreferences = {
  showCents: true,
  showPastGaps: false,
  showHints: true,
};

let current: DisplayPreferences = { ...DEFAULTS };

/** Текущие настройки вида. */
export function getDisplayPreferences(): DisplayPreferences {
  return current;
}

/**
 * Запоминает настройки, пришедшие с сервера.
 *
 * Значения приходят как есть из хранилища «ключ-значение», поэтому каждое
 * приводится к логическому явно: строка `"false"` в булевом месте — самая
 * частая причина настройки, которая «не работает».
 *
 * @param {unknown} raw ответ сервера
 */
export function setDisplayPreferences(raw: unknown): void {
  const source = (raw ?? {}) as Record<string, unknown>;

  const bool = (key: keyof DisplayPreferences): boolean => {
    const value = source[key];
    if (value === undefined || value === null) return DEFAULTS[key];
    if (typeof value === 'string') return value !== 'false' && value !== '0';

    return Boolean(value);
  };

  current = {
    showCents: bool('showCents'),
    showPastGaps: bool('showPastGaps'),
    showHints: bool('showHints'),
  };
}

/** Возвращает настройки к значениям по умолчанию (выход из организации). */
export function resetDisplayPreferences(): void {
  current = { ...DEFAULTS };
}
