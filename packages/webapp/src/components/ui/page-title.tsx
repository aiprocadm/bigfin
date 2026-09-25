import * as React from 'react';

import { cn } from '@/lib/cn';

/**
 * Крупный заголовок страницы (UI-045-1 ТЗ-4, решение R10) — как Large Title
 * в iOS.
 *
 * БЫЛО. Заголовок стоял дважды: мелкий в шапке и свой в теле страницы, да
 * ещё и разными словами («Отчёт о прибылях и убытках» наверху и
 * «Управленческий ОПиУ» ниже — находка O5 живого прохода). В «Деньгах» —
 * трижды.
 *
 * СТАЛО. Заголовок ОДИН — крупный, в теле страницы. Шапка пустая, пока он
 * виден; когда человек прокрутил страницу и заголовок ушёл за край, он
 * «переезжает» в шапку мелким. Человек всегда знает, где он, и ни разу не
 * читает одно и то же дважды.
 *
 * КАК ЭТО УСТРОЕНО. Два общих места:
 * - `collapsed` — текст заголовка, ушедшего за край (его читает шапка);
 * - счётчик «у экрана свой заголовок». У каждого из 121 маршрута есть
 *   подпись `pageTitle`, и каркас сам рисует по ней крупный заголовок —
 *   старые экраны так получают его без переписки. Экран, который рисует
 *   заголовок сам (с кнопками рядом, со строкой «зачем»), сообщает об этом,
 *   и заголовок каркаса уступает ему место. Сообщает до отрисовки
 *   (`useLayoutEffect`), поэтому двух заголовков не видно ни на миг.
 */
interface PageTitleActions {
  setCollapsed: (title: string | null) => void;
  registerOwnTitle: () => () => void;
}

interface PageTitleStateValue {
  /** Заголовок, ушедший за край при прокрутке; `null` — он виден. */
  collapsed: string | null;
  /** Сколько заголовков нарисовал сам экран. */
  ownTitles: number;
}

// Действия и состояние — в разных местах: если бы заголовок читал
// состояние, каждая прокрутка перезапускала бы его наблюдение по кругу.
const ActionsContext = React.createContext<PageTitleActions | null>(null);
const StateContext = React.createContext<PageTitleStateValue>({
  collapsed: null,
  ownTitles: 0,
});

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState<string | null>(null);
  const [ownTitles, setOwnTitles] = React.useState(0);

  const actions = React.useMemo<PageTitleActions>(
    () => ({
      setCollapsed,
      registerOwnTitle: () => {
        setOwnTitles((count) => count + 1);
        return () => setOwnTitles((count) => count - 1);
      },
    }),
    [],
  );
  const state = React.useMemo(
    () => ({ collapsed, ownTitles }),
    [collapsed, ownTitles],
  );

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}

/** Для шапки и каркаса: какой заголовок ушёл за край и есть ли у экрана свой. */
export const usePageTitleState = () => React.useContext(StateContext);

export interface PageTitleProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Заголовок нарисовал каркас по подписи маршрута, а не экран. Такой
   * заголовок не сообщает «у экрана свой» — иначе уступал бы сам себе.
   */
  fromRoute?: boolean;
}

export function PageTitle({ children, className, fromRoute = false }: PageTitleProps) {
  const ref = React.useRef<HTMLHeadingElement>(null);
  const actions = React.useContext(ActionsContext);

  // До отрисовки, а не после: иначе на один кадр видны оба заголовка.
  React.useLayoutEffect(() => {
    if (!actions || fromRoute) return undefined;
    return actions.registerOwnTitle();
  }, [actions, fromRoute]);

  React.useEffect(() => {
    const element = ref.current;
    if (!actions || !element || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        // «Ушёл за край» — только ВВЕРХ. Заголовок ниже края (страница ещё
        // не долистана до него) в шапку не переезжает.
        const top = entry.rootBounds?.top ?? 0;
        const scrolledPast =
          !entry.isIntersecting && entry.boundingClientRect.bottom <= top + 1;
        actions.setCollapsed(scrolledPast ? element.textContent : null);
      },
      { threshold: 0 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      actions.setCollapsed(null);
    };
  }, [actions]);

  return (
    <h1
      ref={ref}
      className={cn(
        // На телефоне ступенью мельче: русские названия отчётов длинные
        // («Оборотно-сальдовая ведомость»), и 32 пункта в ширину 390 рвали
        // бы их на три строки.
        'min-w-0 break-words text-title-2 text-text-primary md:text-large-title',
        className,
      )}
    >
      {children}
    </h1>
  );
}
