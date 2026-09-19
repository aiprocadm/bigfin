// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useField } from 'formik';

import { useLegalEntities } from '@/hooks/query/legalEntities';
import {
  shouldShowLegalEntityBreakdown,
  type LegalEntityRow,
} from '@/containers/LegalEntities/legalEntityView';

/**
 * Юрлица, к которым допущена роль (этап 8 ТЗ, §8.4, остаток К6).
 *
 * ТЗ формулирует это одной фразой: «бухгалтеру ИП видно только ИП, владельцу —
 * всё». Ошибка здесь — это показанные чужие деньги, поэтому правило сказано
 * человеку прямо, а не спрятано за умолчанием.
 *
 * НИЧЕГО НЕ ОТМЕЧЕНО — ДОСТУП КО ВСЕМ. Так ведут себя владелец и
 * администратор: им не надо ничего настраивать, чтобы видеть свою же
 * организацию целиком. Отметки ставят только там, где доступ и правда сужают.
 *
 * ПОЛЯ НЕТ ВОВСЕ, ПОКА ЮРЛИЦО ОДНО (§8.5): сужать доступ не к чему.
 */
export function RoleLegalEntitiesField() {
  const [field, , helpers] = useField('allowed_legal_entity_ids');
  const { data: entities } = useLegalEntities() as {
    data?: LegalEntityRow[];
  };

  if (!shouldShowLegalEntityBreakdown(entities)) return null;

  const selected: Array<number | string> = Array.isArray(field.value)
    ? field.value
    : [];

  const isChecked = (id: number) =>
    selected.some((value) => String(value) === String(id));

  const toggle = (id: number) => {
    helpers.setValue(
      isChecked(id)
        ? selected.filter((value) => String(value) !== String(id))
        : [...selected, id],
    );
  };

  return (
    <section className="flex flex-col gap-2 border-t border-border pt-4">
      <h3 className="text-sm font-medium text-text-primary">
        {intl.get('roles.legal_entities.title')}
      </h3>
      <p className="text-xs text-text-muted">
        {intl.get('roles.legal_entities.hint')}
      </p>

      <div className="mt-1 flex flex-col gap-2">
        {(entities ?? []).map((entity) => (
          <label key={entity.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border"
              checked={isChecked(entity.id)}
              onChange={() => toggle(entity.id)}
            />
            <span>{entity.name}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
