/**
 * Тема оформления (этап 54 ТЗ-4, решение R14): «Светлая / Тёмная / Как в
 * системе», по умолчанию — как в системе.
 *
 * ГДЕ ЖИВЁТ ВЫБОР. В личных настройках вида (`theme` в
 * `settings/display-preferences`, без миграции) — чтобы выбор ехал за
 * человеком на другой компьютер. Копия — в localStorage: её читает
 * `public/preload-theme.js` ДО отрисовки, иначе при каждой загрузке экран
 * вспыхивал бы светлым, пока не придёт ответ сервера.
 *
 * ДВА КЛАССА СРАЗУ: `.dark` включает токены нового кита (`tokens.css`),
 * `bp4-dark` — тёмный вид старых экранов Blueprint. По одному тема была бы
 * наполовину.
 *
 * Страницы оплаты (`/payment…`) и печатные формы — всегда светлые
 * (UI-054-4): их видит клиент и печатает бумага.
 */
export type ThemeChoice = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'bigfin.theme';
/** Прежний ключ (Shift+H старого интерфейса) — читаем, чтобы не потерять выбор. */
const LEGACY_KEY = 'theme';

export const isThemeChoice = (value: unknown): value is ThemeChoice =>
  value === 'light' || value === 'dark' || value === 'system';

export function readStoredTheme(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY);
    return isThemeChoice(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function storeTheme(choice: ThemeChoice): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Хранилище недоступно — тема применится, но при перезагрузке мигнёт.
  }
}

const systemPrefersDark = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;

/** Итоговая тема: выбор человека, а «как в системе» — по настройке ОС. */
export function resolveTheme(choice: ThemeChoice, systemDark = systemPrefersDark()): 'light' | 'dark' {
  if (choice === 'system') return systemDark ? 'dark' : 'light';
  return choice;
}

/**
 * Страница оплаты — `/payment/:linkId`. Именно со слешем: «/payment-calendar»
 * (платёжный календарь) тоже начинается с «/payment», и проверка без слеша
 * держала его всегда светлым (живой проход этапа 55).
 */
export const isAlwaysLightPath = (pathname: string) => pathname === '/payment' || pathname.startsWith('/payment/');
const alwaysLight = () => typeof window !== 'undefined' && isAlwaysLightPath(window.location.pathname);

export function applyTheme(choice: ThemeChoice): void {
  if (typeof document === 'undefined') return;
  const dark = !alwaysLight() && resolveTheme(choice) === 'dark';
  [document.documentElement, document.body].forEach((node) => {
    node?.classList.toggle('dark', dark);
    node?.classList.toggle('bp4-dark', dark);
  });
  // Цвет строки состояния телефона и окна «на экране Домой» — по теме
  // (UI-053-3).
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0D1017' : '#FCFCFD');
}

let unsubscribe: (() => void) | null = null;

/**
 * Применить выбор и, для «как в системе», следить за сменой темы ОС:
 * телефон вечером темнеет — продукт вместе с ним, без перезагрузки.
 */
export function setThemeChoice(choice: ThemeChoice): void {
  storeTheme(choice);
  applyTheme(choice);
  unsubscribe?.();
  unsubscribe = null;
  if (choice === 'system' && typeof window !== 'undefined' && window.matchMedia) {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener?.('change', onChange);
    unsubscribe = () => media.removeEventListener?.('change', onChange);
  }
}
