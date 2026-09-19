// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';
import { useFormContext } from 'react-hook-form';

import { Label } from '@/components/ui/label';
import { useLegalEntities } from '@/hooks/query/legalEntities';

import { FinancialHeaderSkeleton } from './FinancialHeaderSkeleton';
import { ReportCheckboxRow } from './FinancialHeaderBranchesField';

interface LegalEntityOption {
  id: number;
  name: string;
}

/**
 * Разрез отчёта по юрлицам (этап 7 ТЗ, §7.1; остаток О5/К1).
 *
 * ДВА ПРАВИЛА, КОТОРЫЕ ВАЖНЕЕ УДОБСТВА.
 *
 * 1. Поля НЕТ ВОВСЕ, пока юрлицо одно. Приёмка §8.5 требует прямо: «организация
 *    с одним юрлицом не видит никаких изменений в интерфейсе». Выбор из одного
 *    — не выбор, а лишний вопрос без ответа.
 *
 * 2. Ничего не выбрано — значит ВСЕ юрлица, то есть сводный отчёт по группе.
 *    Именно так отчёт вёл себя до появления разреза. Трактовать пустой выбор
 *    как «ничего не показывать» значило бы опустошить отчёт у всех, кто не
 *    знает про новое поле.
 */
export function ReportLegalEntitiesField() {
  const form = useFormContext();
  const { data: entities, isLoading } = useLegalEntities() as {
    data?: LegalEntityOption[];
    isLoading: boolean;
  };

  const watched: unknown = form.watch('legalEntityIds');
  const selectedIds: Array<number | string> = Array.isArray(watched)
    ? (watched as Array<number | string>)
    : [];

  const isSelected = (id: number | string) =>
    selectedIds.some((value) => String(value) === String(id));

  const toggle = (id: number | string) => {
    const next = isSelected(id)
      ? selectedIds.filter((value) => String(value) !== String(id))
      : [...selectedIds, id];

    form.setValue('legalEntityIds', next);
  };

  if (isLoading) {
    return <FinancialHeaderSkeleton />;
  }

  // Одно юрлицо — разреза не существует.
  if ((entities?.length ?? 0) < 2) return null;

  return (
    <div className="flex max-w-md flex-col gap-2">
      <Label>{intl.get('report.legal_entities.label')}</Label>

      <div className="flex flex-col gap-2">
        {(entities ?? []).map((entity) => (
          <ReportCheckboxRow
            key={String(entity.id)}
            label={entity.name}
            checked={isSelected(entity.id)}
            onCheckedChange={() => toggle(entity.id)}
          />
        ))}
      </div>

      <p className="text-xs text-text-muted">
        {intl.get('report.legal_entities.hint')}
      </p>
    </div>
  );
}
