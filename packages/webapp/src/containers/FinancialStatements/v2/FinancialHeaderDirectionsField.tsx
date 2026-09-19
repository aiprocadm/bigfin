// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';
import { useFormContext } from 'react-hook-form';

import { Label } from '@/components/ui/label';
import { useDirections } from '@/hooks/query/projects';
import {
  isDirectionActive,
  shouldShowDirectionBreakdown,
  type ProjectRow,
} from '@/containers/Directions/directionView';

import { FinancialHeaderSkeleton } from './FinancialHeaderSkeleton';
import { ReportCheckboxRow } from './FinancialHeaderBranchesField';

/**
 * Разрез отчёта по направлениям (остаток О6 ТЗ).
 *
 * ДВА ПРАВИЛА.
 *
 * 1. Поля НЕТ ВОВСЕ, пока направление одно или их нет: выбор из одного — не
 *    выбор, а лишний вопрос без ответа. То же правило, что у юрлиц, и взято
 *    оно из одного места — вторая копия однажды разошлась бы с первой.
 *
 * 2. Ничего не выбрано — ВСЕ операции, включая непомеченные. Именно так отчёт
 *    вёл себя до появления разреза. Как только направления выбраны, операции
 *    без направления выпадают — и об этом сказано подписью под полем, иначе
 *    итог окажется меньше общего без видимой причины.
 *
 * Убранные из выбора направления не предлагаются: на них больше не относят
 * новые операции, а старые видны через «все».
 */
export function ReportDirectionsField() {
  const form = useFormContext();
  const { data: directions, isLoading } = useDirections() as {
    data?: ProjectRow[];
    isLoading: boolean;
  };

  const watched: unknown = form.watch('projectsIds');
  const selectedIds: Array<number | string> = Array.isArray(watched)
    ? (watched as Array<number | string>)
    : [];

  const isSelected = (id: number | string) =>
    selectedIds.some((value) => String(value) === String(id));

  const toggle = (id: number | string) => {
    form.setValue(
      'projectsIds',
      isSelected(id)
        ? selectedIds.filter((value) => String(value) !== String(id))
        : [...selectedIds, id],
    );
  };

  if (isLoading) {
    return <FinancialHeaderSkeleton />;
  }

  if (!shouldShowDirectionBreakdown(directions)) return null;

  const offered = (directions ?? []).filter(isDirectionActive);

  return (
    <div className="flex max-w-md flex-col gap-2">
      <Label>{intl.get('report.directions.label')}</Label>

      <div className="flex flex-col gap-2">
        {offered.map((direction) => (
          <ReportCheckboxRow
            key={String(direction.id)}
            label={direction.name}
            checked={isSelected(direction.id)}
            onCheckedChange={() => toggle(direction.id)}
          />
        ))}
      </div>

      <p className="text-xs text-text-muted">
        {intl.get('report.directions.hint')}
      </p>
    </div>
  );
}
