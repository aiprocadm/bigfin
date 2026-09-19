// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';
import { useFormContext } from 'react-hook-form';

import { FCheckbox } from '@/components';
import { useLegalEntities } from '@/hooks/query/legalEntities';
import {
  shouldShowLegalEntityBreakdown,
  type LegalEntityRow,
} from '@/containers/LegalEntities/legalEntityView';

/**
 * Отметка «внутригрупповая операция» (этап 7 ТЗ, §7.2, остаток К2).
 *
 * ЗАЧЕМ. Программа помечает такие операции сама, но видит она только юрлицо
 * СЧЁТА. Перевод собственной компании, оформленный документом на контрагента,
 * она не распознает никогда — и в сводном отчёте по группе одна и та же
 * выручка посчитается дважды. Здесь человек говорит об этом прямо.
 *
 * ПОЛЯ НЕТ ВОВСЕ, ПОКА ЮРЛИЦО ОДНО. Требование §8.5: организация с одним
 * юрлицом не видит никаких изменений в интерфейсе. Внутригрупповых операций
 * у неё и быть не может — не с кем.
 *
 * Отметка только ДОБАВЛЯЕТ признак: снять автоматический ею нельзя, иначе
 * стало бы возможно дважды посчитать одну выручку.
 */
export function IntercompanyField({ name }: { name: string }) {
  const form = useFormContext();
  const { data: entities } = useLegalEntities() as {
    data?: LegalEntityRow[];
  };

  // Юрлицо одно — внутригрупповых операций не бывает.
  if (!shouldShowLegalEntityBreakdown(entities)) return null;

  const value = Boolean(form.watch(name));

  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-border"
        checked={value}
        onChange={(event) => form.setValue(name, event.target.checked)}
      />
      <span>
        <span className="text-text-primary">
          {intl.get('intercompany.label')}
        </span>
        <span className="block text-xs text-text-muted">
          {intl.get('intercompany.hint')}
        </span>
      </span>
    </label>
  );
}

/**
 * То же самое для форм на прежней библиотеке (журнал проводок).
 *
 * Отдельный вариант нужен не из-за оформления, а из-за устройства форм:
 * новые экраны держат значения в React Hook Form, прежние — в Formik, и
 * общего способа прочитать поле у них нет. Правило показа при этом ОДНО:
 * второй копии правила «когда показывать» не заведено.
 */
export function IntercompanyFieldLegacy({ name }: { name: string }) {
  const { data: entities } = useLegalEntities() as {
    data?: LegalEntityRow[];
  };

  // Юрлицо одно — внутригрупповых операций не бывает.
  if (!shouldShowLegalEntityBreakdown(entities)) return null;

  return (
    <div className="flex flex-col gap-1">
      <FCheckbox name={name} label={intl.get('intercompany.label')} />
      <span className="text-xs text-text-muted">
        {intl.get('intercompany.hint')}
      </span>
    </div>
  );
}
