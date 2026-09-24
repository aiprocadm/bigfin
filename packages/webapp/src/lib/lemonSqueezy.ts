/**
 * Виджет оплаты Lemon Squeezy — по требованию, а не тегом в index.html.
 *
 * Раньше `<script src=".../lemon.js">` стоял в разметке без async и держал
 * запуск приложения на КАЖДОЙ загрузке страницы, хотя нужен только экранам
 * подписки. Чужой домен из России отвечает медленно или 403 — вход ждал его.
 *
 * Тонкость: lemon.js включается сам только по событию `load` окна. Скачанный
 * позже, он этого события уже не увидит, поэтому после загрузки зовём
 * `createLemonSqueezy()` сами.
 */
export const LEMON_SQUEEZY_SRC = 'https://app.lemonsqueezy.com/js/lemon.js';

type LemonSqueezy = NonNullable<Window['LemonSqueezy']>;

let pending: Promise<LemonSqueezy> | null = null;

export function loadLemonSqueezy(): Promise<LemonSqueezy> {
  if (window.LemonSqueezy) return Promise.resolve(window.LemonSqueezy);
  if (pending) return pending;

  pending = new Promise<LemonSqueezy>((resolve, reject) => {
    const fail = () => {
      // Следующая попытка (повторный клик) скачает скрипт заново.
      pending = null;
      script.remove();
      reject(new Error('Не удалось загрузить виджет оплаты Lemon Squeezy'));
    };
    const script = document.createElement('script');
    script.src = LEMON_SQUEEZY_SRC;
    script.async = true;
    script.onload = () => {
      if (!window.LemonSqueezy) window.createLemonSqueezy?.();
      if (window.LemonSqueezy) resolve(window.LemonSqueezy);
      else fail();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return pending;
}

/** Только для тестов: забыть начатую загрузку. */
export function resetLemonSqueezyLoader() {
  pending = null;
}
