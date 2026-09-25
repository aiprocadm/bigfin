import * as React from 'react';

import { PageTitle, usePageTitleState } from '@/components/ui/page-title';

/**
 * Заголовок экрана по подписи маршрута (UI-045-1 ТЗ-4).
 *
 * У всех 121 маршрута есть `pageTitle`, но свой заголовок в теле рисовали
 * только новые экраны, и то каждый по-своему. Раньше подпись маршрута жила в
 * шапке — и на новых экранах заголовок читался дважды. Теперь каркас рисует
 * по ней крупный заголовок сам, а шапка показывает его только после
 * прокрутки. Старые экраны получают заголовок без переписки.
 *
 * Экран с собственным заголовком (`PageHeader` или `PageTitle`) сообщает о
 * нём, и этот уступает место: заголовок на экране всегда один.
 */
export function RouteTitle({ title }: { title?: React.ReactNode }) {
  const { ownTitles } = usePageTitleState();

  if (!title || ownTitles > 0) return null;

  return (
    <div className="bigfin-ui px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
      <PageTitle fromRoute>{title}</PageTitle>
    </div>
  );
}
