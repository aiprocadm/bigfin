import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { Label } from '@/components/ui/label';

import { ReportCheckboxRow } from './FinancialHeaderBranchesField';

/** Элемент списка сущностей (клиент/поставщик/позиция) для мультивыбора. */
export interface ReportEntityOption {
  id: number | string;
  name: string;
}

interface ReportEntitiesFieldProps {
  /** Имя RHF-поля с массивом идентификаторов (customersIds/vendorsIds/itemsIds). */
  name: string;
  /** Подпись списка, например «Выбранные клиенты». */
  label: React.ReactNode;
  items: ReportEntityOption[];
}

/**
 * Мультивыбор сущностей галочками для панели настроек отчёта (замена легаси
 * CustomersMultiSelect/VendorsMultiSelect/ItemsMultiSelect на Blueprint).
 * Имя поля и массив идентификаторов — те же, что в легаси-формах
 * (данные и query не меняем). Длинный список прокручивается.
 */
export function ReportEntitiesField({
  name,
  label,
  items,
}: ReportEntitiesFieldProps) {
  const form = useFormContext();

  const watched: unknown = form.watch(name);
  const selectedIds: Array<number | string> = Array.isArray(watched)
    ? (watched as Array<number | string>)
    : [];

  // Идентификаторы из URL могут прийти строками — сравниваем как строки.
  const isSelected = (id: number | string) =>
    selectedIds.some((value) => String(value) === String(id));

  const toggleEntity = (id: number | string) => {
    const next = isSelected(id)
      ? selectedIds.filter((value) => String(value) !== String(id))
      : [...selectedIds, id];

    form.setValue(name, next);
  };

  return (
    <div className="flex max-w-md flex-col gap-2">
      <Label>{label}</Label>

      <div className="flex max-h-52 flex-col gap-2 overflow-y-auto pr-1">
        {items.map((item) => (
          <ReportCheckboxRow
            key={String(item.id)}
            label={item.name}
            checked={isSelected(item.id)}
            onCheckedChange={() => toggleEntity(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
