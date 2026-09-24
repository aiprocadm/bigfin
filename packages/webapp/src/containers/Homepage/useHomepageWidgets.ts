import React from 'react';
import { useQueryClient } from 'react-query';

import {
  DASHBOARD_PREFERENCES_KEY,
  parseDashboardPreferences,
  useDashboardPreferences,
  useSaveDashboardPreferences,
  type DashboardPreferences,
  type DashboardWidgetsPreference,
} from '@/hooks/query/dashboardPreferences';

import {
  HOMEPAGE_WIDGETS,
  HomepageWidgetId,
  orderWidgets,
} from './homepageWidgets';

/** Сколько ждать тишины, прежде чем сохранить. */
const SAVE_DELAY_MS = 600;

/**
 * Порядок и видимость блоков главной (FT-064 ТЗ-3).
 *
 * ЭКРАН ОТЗЫВАЕТСЯ СРАЗУ, СЕРВЕР — ПОТОМ. Перетаскивание блока — это
 * серия быстрых перестановок, и слать запрос на каждую незачем: изменения
 * копятся, а сохраняется последнее, когда человек перестал двигать.
 * Ушёл со страницы раньше — сохраняем сразу, выбор не теряется.
 *
 * Пока настройки не пришли (или не пришли вовсе), главная показывается в
 * порядке по умолчанию: ждать настройку вида ради денег незачем.
 */
export function useHomepageWidgets() {
  const client = useQueryClient();
  const { data } = useDashboardPreferences();
  const { mutate } = useSaveDashboardPreferences();

  const pending = React.useRef<DashboardWidgetsPreference | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!pending.current) return;
    mutate({ widgets: pending.current });
    pending.current = null;
  }, [mutate]);

  // Уход со страницы — не повод терять последнюю перестановку.
  React.useEffect(() => () => flush(), [flush]);

  const save = React.useCallback(
    (next: DashboardWidgetsPreference) => {
      client.setQueryData<DashboardPreferences>(
        [DASHBOARD_PREFERENCES_KEY],
        (old) => ({ ...(old ?? parseDashboardPreferences(null)), widgets: next }),
      );
      pending.current = next;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [client, flush],
  );

  const saved = data?.widgets ?? { order: [], hidden: [] };
  const order = orderWidgets(HOMEPAGE_WIDGETS, saved.order);
  const hidden = saved.hidden.filter((id): id is HomepageWidgetId =>
    (HOMEPAGE_WIDGETS as readonly string[]).includes(id),
  );

  return {
    order,
    hidden,
    setOrder: (next: HomepageWidgetId[]) => save({ order: next, hidden }),
    setHidden: (id: HomepageWidgetId, isHidden: boolean) =>
      save({
        order,
        hidden: isHidden
          ? [...hidden.filter((item) => item !== id), id]
          : hidden.filter((item) => item !== id),
      }),
    // «Вернуть как было» — пустая настройка, а не записанный порядок по
    // умолчанию: тогда новые блоки продукта встанут на свои места сами.
    reset: () => save({ order: [], hidden: [] }),
  };
}
