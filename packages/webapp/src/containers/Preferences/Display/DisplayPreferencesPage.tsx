import React from 'react';
import intl from 'react-intl-universal';
import { setDisplayPreferences } from '@/utils/displayPreferences';
import { useMutation, useQuery, useQueryClient } from 'react-query';

import useApiRequest from '@/hooks/useRequest';
import { transformToCamelCase } from '@/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTitle } from '@/components/ui/page-title';

/**
 * Личные настройки отображения (FIN-026 ТЗ-2).
 *
 * ЭТО НАСТРОЙКИ ЧЕЛОВЕКА, А НЕ ОРГАНИЗАЦИИ. Бухгалтер, ведущий три компании,
 * в одной хочет видеть копейки, в другой — нет, и это не противоречие, а
 * разная работа. Поэтому они хранятся на пару «человек + организация» и
 * соседу не видны.
 *
 * УМОЛЧАНИЯ — ПРЕЖНЕЕ ПОВЕДЕНИЕ ПРОДУКТА. Тот, кто сюда не заходил, не
 * должен заметить, что настройки появились.
 */
const KEY = 'DISPLAY_PREFERENCES';

const TOGGLES = [
  { key: 'showCents', labelId: 'display_preferences.show_cents' },
  { key: 'showPastGaps', labelId: 'display_preferences.show_past_gaps' },
];

export default function DisplayPreferencesPage() {
  const apiRequest = useApiRequest();
  const client = useQueryClient();

  const { data, isLoading } = useQuery([KEY], () =>
    apiRequest
      .get('settings/display-preferences', {})
      .then((res: any) => transformToCamelCase(res.data)),
  );

  const save = useMutation(
    (values: Record<string, unknown>) =>
      (apiRequest as any).put('settings/display-preferences', values),
    {
      onSuccess: (_result: any, values: Record<string, unknown>) => {
        // СРАЗУ ПРИМЕНЯЕМ К ПЕЧАТИ СУММ. Без этого галочка сохранялась и
        // не меняла ничего до следующего входа: печать денег читает свой
        // модуль, а не запрос (FIN-026).
        setDisplayPreferences(values);
        client.invalidateQueries([KEY]);
        // Настройки меняют вид денег по всему продукту: виджет в шапке и
        // отчёты обязаны перерисоваться, иначе человек увидит копейки там,
        // где только что их выключил.
        client.invalidateQueries(['DASHBOARD_MONEY_WIDGET']);
        client.invalidateQueries(['DASHBOARD_OVERVIEW']);
        client.invalidateQueries(['DASHBOARD_MONEY_SUMMARY']);
      },
    },
  );

  if (isLoading) return <Skeleton className="m-6 h-40 w-full" />;

  const prefs: any = data ?? {};

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <PageTitle>
          {intl.get('display_preferences.page_title')}
        </PageTitle>
        <p className="mt-1 max-w-[70ch] text-sm text-text-secondary">
          {intl.get('display_preferences.page_hint')}
        </p>
      </div>

      <ul className="flex max-w-2xl flex-col gap-3">
        {TOGGLES.map((toggle) => (
          <li key={toggle.key} className="flex items-start gap-2">
            <Checkbox
              id={toggle.key}
              checked={Boolean(prefs[toggle.key])}
              onCheckedChange={(checked: boolean) =>
                save.mutate({ [toggle.key]: Boolean(checked) })
              }
            />
            <label htmlFor={toggle.key} className="text-sm">
              {intl.get(toggle.labelId)}
              <span className="block text-xs text-text-secondary">
                {intl.get(`${toggle.labelId}.hint`)}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
