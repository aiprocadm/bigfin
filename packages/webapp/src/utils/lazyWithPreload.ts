import * as React from 'react';

/**
 * Разделение кода по разделам с предзагрузкой (UI-055-3 ТЗ-4, R24).
 *
 * Каждый экран — свой кусок сборки (`React.lazy`), и грузится он только при
 * переходе. Пауза на загрузку заметна; её прячем, начиная загрузку раньше —
 * при наведении на пункт меню или фокусе на нём: пока палец или мышь доходят
 * до нажатия, кусок уже в пути.
 *
 * ОДИН КОМПОНЕНТ НА ЭКРАН. Реестр маршрутов строится заново при каждом
 * обращении (в нём строки перевода), и без кеша каждый раз получался бы новый
 * `lazy`-компонент: React счёл бы его другим экраном и пересоздал бы страницу
 * со всем её состоянием. Ключ кеша — текст загрузчика: `() => import('…')`
 * у каждого экрана свой и не меняется.
 */
export type PreloadableComponent<T extends React.ComponentType<any>> = React.LazyExoticComponent<T> & {
  preload: () => Promise<{ default: T }>;
};

const cache = new Map<string, PreloadableComponent<any>>();

export function lazyWithPreload<T extends React.ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
): PreloadableComponent<T> {
  // Кешируется только загрузчик вида `() => import('…')` (в тестах сборщик
  // пишет его как `__vi_ssr_dynamic_import__(…)`): у обёрток общего
  // вида текст одинаковый, и разные экраны слиплись бы в один.
  const key = /import\w*\(/.test(String(loader)) ? String(loader) : null;
  const cached = key === null ? undefined : cache.get(key);
  if (cached) return cached as PreloadableComponent<T>;

  let pending: Promise<{ default: T }> | null = null;
  const load = () => {
    // Неудачная загрузка (сеть моргнула) не запоминается: следующая попытка
    // пойдёт заново, а не вернёт ту же ошибку.
    pending ??= loader().catch((error) => {
      pending = null;
      throw error;
    });
    return pending;
  };
  const component = Object.assign(React.lazy(load), { preload: load });
  if (key !== null) cache.set(key, component);
  return component;
}

/** Есть ли у компонента предзагрузка (старые маршруты могут быть без неё). */
export function canPreload(component: unknown): component is { preload: () => Promise<unknown> } {
  return typeof (component as { preload?: unknown } | null)?.preload === 'function';
}
