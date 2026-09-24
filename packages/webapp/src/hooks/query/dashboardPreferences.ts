// © 2026 Bigfin
import { useMutation, useQuery, useQueryClient } from 'react-query';

import useApiRequest from '../useRequest';
import { fromApi } from '@/utils/fromApi';

/**
 * Личные настройки главной (FT-064, FT-065 ТЗ-3).
 *
 * Лежат в тех же настройках вида человека, что и копейки или сохранённые
 * фильтры (`settings/display-preferences`): новой ручки не заводим. Эту
 * ручку читает при входе каждый человек, так что отказа в доступе, который
 * закрыл бы весь экран, здесь быть не может.
 */
export const DASHBOARD_PREFERENCES_KEY = 'DASHBOARD_DISPLAY_PREFERENCES';

export interface DashboardWidgetsPreference {
  /** Порядок блоков; пустой — порядок по умолчанию. */
  order: string[];
  /** Скрытые блоки. */
  hidden: string[];
}

export interface DashboardTargetsPreference {
  /** Цель по доле расходов в выручке, %; `null` — цели нет. */
  expenseShare: number | null;
  /** Цель по доле ФОТ в выручке, %; `null` — цели нет. */
  payrollShare: number | null;
}

export interface DashboardPreferences {
  widgets: DashboardWidgetsPreference;
  targets: DashboardTargetsPreference;
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];

const percent = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

/**
 * Разбор ответа.
 *
 * Сервер отдаёт имена в змеином виде (`dashboard_widgets`,
 * `expense_share`) — так устроен его общий перехватчик. Читаем оба вида:
 * настройка, которая молча не читается из-за имени поля, выглядит как
 * «сохранил, а она не работает». Мусор превращается в умолчания, а не
 * роняет главную: настройка вида — удобство, а не данные бизнеса.
 */
export function parseDashboardPreferences(raw: unknown): DashboardPreferences {
  const source = (raw ?? {}) as Record<string, any>;
  const widgets = source.dashboardWidgets ?? source.dashboard_widgets ?? {};
  const targets = source.dashboardTargets ?? source.dashboard_targets ?? {};

  return {
    widgets: {
      order: strings(widgets?.order),
      hidden: strings(widgets?.hidden),
    },
    targets: {
      expenseShare: percent(targets?.expenseShare ?? targets?.expense_share),
      payrollShare: percent(targets?.payrollShare ?? targets?.payroll_share),
    },
  };
}

/** Настройки главной человека. */
export function useDashboardPreferences() {
  const api = useApiRequest();

  return useQuery<DashboardPreferences>(
    [DASHBOARD_PREFERENCES_KEY],
    () =>
      (api as any)
        .get('settings/display-preferences')
        .then((res: any) =>
          parseDashboardPreferences(fromApi(res.data?.data ?? res.data)),
        ),
    // Сбой чтения не повод трогать главную: она покажется как по умолчанию.
    { staleTime: 5 * 60 * 1000, retry: false },
  );
}

export type DashboardPreferencesChange = Partial<DashboardPreferences>;

/**
 * Сохранить часть настроек главной.
 *
 * ОТЗЫВАЕТСЯ СРАЗУ, ДО ОТВЕТА СЕРВЕРА: человек снял галочку — блок исчез
 * в ту же секунду. При сбое настройки перечитываются с сервера, и экран
 * возвращается к тому, что сохранено на самом деле.
 */
export function useSaveDashboardPreferences() {
  const api = useApiRequest();
  const client = useQueryClient();

  return useMutation(
    (change: DashboardPreferencesChange) => {
      // Имена — в верблюжьем виде: сервер хранит именно такие ключи.
      const body: Record<string, unknown> = {};
      if (change.widgets) body.dashboardWidgets = change.widgets;
      if (change.targets) body.dashboardTargets = change.targets;
      return (api as any).put('settings/display-preferences', body);
    },
    {
      onMutate: async (change: DashboardPreferencesChange) => {
        // Запрос, ушедший раньше, не должен перезаписать свежий выбор.
        await client.cancelQueries([DASHBOARD_PREFERENCES_KEY]);
        client.setQueryData<DashboardPreferences>(
          [DASHBOARD_PREFERENCES_KEY],
          (old) => ({ ...parseDashboardPreferences(null), ...old, ...change }),
        );
      },
      onError: () => {
        client.invalidateQueries([DASHBOARD_PREFERENCES_KEY]);
      },
    },
  );
}
