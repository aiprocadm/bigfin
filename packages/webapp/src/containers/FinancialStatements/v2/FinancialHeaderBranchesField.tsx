import * as React from 'react';
import intl from 'react-intl-universal';
import { useFormContext } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useBranches } from '@/hooks/query';

import { FinancialHeaderSkeleton } from './FinancialHeaderSkeleton';

// ---------------------------------------------------------------------------
// Локальные типы и касты легаси-хуков (react-query хуки без типов).
// ---------------------------------------------------------------------------

interface BranchOption {
  id: number | string;
  name: string;
}

const useBranchesTyped = useBranches as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => { data?: BranchOption[]; isLoading: boolean };

// ---------------------------------------------------------------------------
// Строка «галочка + подпись» — общий кирпичик панелей настроек отчётов.
// ---------------------------------------------------------------------------

export interface ReportCheckboxRowProps {
  label: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export function ReportCheckboxRow({
  label,
  checked,
  onCheckedChange,
  className,
}: ReportCheckboxRowProps) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 text-sm text-text-primary ${
        className ?? ''
      }`}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      {label}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Вкладка «Аналитика»: мультивыбор филиалов галочками.
// ---------------------------------------------------------------------------

/**
 * Поле выбора филиалов для панели настроек отчёта (замена легаси
 * BranchMultiSelect на Blueprint). Ожидает RHF-поле `branchesIds` —
 * то же имя, что в легаси-формах отчётов (данные и query не меняем).
 * Рендерить только при включённой фиче Branches.
 */
export function ReportBranchesField() {
  const form = useFormContext();
  const { data: branches, isLoading } = useBranchesTyped(
    {},
    { keepPreviousData: true },
  );

  const watched: unknown = form.watch('branchesIds');
  const selectedIds: Array<number | string> = Array.isArray(watched)
    ? (watched as Array<number | string>)
    : [];

  const isSelected = (id: number | string) =>
    selectedIds.some((value) => String(value) === String(id));

  const toggleBranch = (id: number | string) => {
    const next = isSelected(id)
      ? selectedIds.filter((value) => String(value) !== String(id))
      : [...selectedIds, id];

    form.setValue('branchesIds', next);
  };

  if (isLoading) {
    return <FinancialHeaderSkeleton />;
  }
  return (
    <div className="flex max-w-md flex-col gap-2">
      <Label>{intl.get('branches_multi_select.label')}</Label>

      <div className="flex flex-col gap-2">
        {(branches ?? []).map((branch) => (
          <ReportCheckboxRow
            key={String(branch.id)}
            label={branch.name}
            checked={isSelected(branch.id)}
            onCheckedChange={() => toggleBranch(branch.id)}
          />
        ))}
      </div>
    </div>
  );
}
