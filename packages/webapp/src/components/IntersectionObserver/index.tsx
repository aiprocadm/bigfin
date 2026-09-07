// @ts-nocheck
import React from 'react';
import { useIntersectionObserver } from '@/hooks/utils';

/**
 * Intersection observer.
 */
interface IntersectionObserverProps {
  /** Что делать, когда метка показалась на экране. */
  onIntersect?: () => void;
  /**
   * Следить или нет. Все пять вызывающих передают
   * `enabled={!isFetchingNextPage}` — «не следи, пока грузится следующая
   * страница». Раньше признак сюда приходил и никуда не шёл: строка ниже
   * была закомментирована, а наблюдатель по умолчанию включён. Из-за этого
   * подгрузка могла сработать ещё раз поверх незавершённой (Д1 карты v68).
   */
  enabled?: boolean;
}

export function IntersectionObserver({
  onIntersect,
  enabled = true,
}: IntersectionObserverProps) {
  const loadMoreButtonRef = React.useRef();

  useIntersectionObserver({
    enabled,
    target: loadMoreButtonRef,
    onIntersect: () => {
      onIntersect && onIntersect();
    },
  });

  return (
    <div
      ref={loadMoreButtonRef}
      style={{ opacity: 0, height: 0, width: 0, padding: 0, margin: 0 }}
    >
      Load Newer
    </div>
  );
}
