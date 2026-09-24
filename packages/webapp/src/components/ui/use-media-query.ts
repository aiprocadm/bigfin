import * as React from 'react';

/**
 * Совпадает ли медиазапрос сейчас; следит за изменением (поворот телефона,
 * сужение окна). Без `matchMedia` (тесты, печать) — `false`.
 */
export function useMediaQuery(query: string): boolean {
  const get = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false;
  const [matches, setMatches] = React.useState(get);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener?.('change', onChange);
    return () => list.removeEventListener?.('change', onChange);
  }, [query]);

  return matches;
}

/** Телефон — уже 768 точек (граница `md` проекта). */
export const PHONE_QUERY = '(max-width: 767px)';

export const useIsPhone = () => useMediaQuery(PHONE_QUERY);
