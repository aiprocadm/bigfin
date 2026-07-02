import * as React from 'react';
import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
  type Control,
  type FieldValues,
} from 'react-hook-form';
import { Plus, X } from 'lucide-react';
import intl from 'react-intl-universal';

import { cn } from '@/lib/cn';
import { Button } from './button';
import { Combobox, type ComboboxItem } from './combobox';
import { Input } from './input';

/**
 * LineItemsEditor — редактор строк-позиций документа (счёт, смета)
 * поверх React Hook Form `useFieldArray`.
 *
 * Примитив-пилот D-редизайна: заменяет легаси
 * `containers/Entries/ItemsEntriesTable` (Blueprint + DataTableEditable)
 * на слой представления без собственного состояния данных.
 *
 * Колонки: позиция (Combobox), количество, цена, сумма (= кол-во × цена,
 * вычисляется на лету), удаление строки. Под таблицей — кнопка добавления
 * строки и итог по всем строкам.
 *
 * Опциональные колонки (для документов со скидками и налогами):
 * - `showDiscount` — колонка «Скидка %», сумма строки считается с её учётом;
 * - `taxRates` — колонка «Налог» (Combobox по полю `tax_rate_id`),
 *   появляется, если переданы опции ставок.
 * По умолчанию обе выключены — существующие потребители не меняются.
 *
 * Требования к окружению:
 * - Рендерить внутри `<FormProvider>` (или `<Form {...form}>` из ui/form) —
 *   компонент берёт `control` из `useFormContext()`.
 * - Рендерить внутри `.bigfin-ui` (Tailwind-стили работают только там);
 *   сам примитив обёртку не добавляет — как и data-table.
 * - Значения строк — строки (`string`), как приходят из инпутов; числа
 *   парсятся толерантно к запятой («1,5» → 1.5).
 *
 * Пример подключения в форме документа:
 * ```tsx
 * const form = useForm({ defaultValues: { entries: [emptyLineItem] } });
 *
 * <Form {...form}>
 *   <LineItemsEditor name="entries" items={itemOptions} />
 * </Form>
 * ```
 */

/** Значения одной строки-позиции (все поля — строки из инпутов). */
export interface LineItemValues {
  item_id: string;
  quantity: string;
  rate: string;
  /** Описание строки (колонка появляется при showDescription). */
  description?: string;
  /** Скидка на строку в процентах (колонка появляется при showDiscount). */
  discount?: string;
  /** Налоговая ставка строки (колонка появляется при переданных taxRates). */
  tax_rate_id?: string;
}

/** Пустая строка-позиция для `defaultValues` формы и добавления строк. */
export const emptyLineItem: LineItemValues = {
  item_id: '',
  quantity: '',
  rate: '',
};

/**
 * Чистый парсинг числа из пользовательского ввода.
 * Терпим к запятой-разделителю и пробелам; мусор и пустота → 0.
 */
export function parseNumericInput(
  raw: string | number | null | undefined,
): number {
  if (raw == null || raw === '') return 0;
  const normalized = String(raw).replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Чистый расчёт суммы строки: количество × цена − скидка %.
 * Скидка опциональна (по умолчанию 0) — прежняя сигнатура сохранена.
 */
export function computeLineAmount(
  quantity: string | number | null | undefined,
  rate: string | number | null | undefined,
  discount?: string | number | null,
): number {
  const base = parseNumericInput(quantity) * parseNumericInput(rate);
  return base - (base * parseNumericInput(discount)) / 100;
}

/** Чистый расчёт итога по всем строкам (скидка строки учитывается). */
export function computeLinesTotal(
  lines: ReadonlyArray<Partial<LineItemValues> | undefined>,
): number {
  return lines.reduce(
    (sum, line) =>
      sum + computeLineAmount(line?.quantity, line?.rate, line?.discount),
    0,
  );
}

/** Формат денег для вычисляемых ячеек (2 знака, локаль браузера). */
function formatAmount(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export interface LineItemsEditorProps {
  /** Имя массива в форме (путь для `useFieldArray`), напр. `entries`. */
  name: string;
  /** Опции позиций для Combobox: `{ value, label }`. */
  items: ComboboxItem[];
  /** Меньше этого числа строк удалять нельзя (по умолчанию 1). */
  minLines?: number;
  /** Доп. классы контейнера. */
  className?: string;
  /** Показать колонку «Описание» (по умолчанию выключена). */
  showDescription?: boolean;
  /** Показать колонку «Скидка %» (по умолчанию выключена). */
  showDiscount?: boolean;
  /** Опции налоговых ставок; колонка «Налог» появляется, если переданы. */
  taxRates?: ComboboxItem[];
  /**
   * Шаблон новой строки для кнопки «Добавить строку».
   * По умолчанию — emptyLineItem; формы документов могут передать свой
   * дефолт с дополнительными полями (скидка, налог, описание).
   */
  emptyLine?: Partial<LineItemValues> & Record<string, unknown>;
  /** Колбэк после выбора позиции в строке (автоподстановка цены и пр.). */
  onItemChange?: (index: number, itemId: string) => void;
}

/**
 * Редактор строк-позиций документа. Работает внутри FormProvider —
 * см. JSDoc модуля выше.
 */
export function LineItemsEditor({
  name,
  items,
  minLines = 1,
  className,
  showDescription = false,
  showDiscount = false,
  taxRates,
  emptyLine,
  onItemChange,
}: LineItemsEditorProps) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  const showTax = Array.isArray(taxRates) && taxRates.length > 0;

  // Живые значения строк (fields из useFieldArray не обновляются при вводе).
  const watched = useWatch({ control, name }) as
    | Array<Partial<LineItemValues> | undefined>
    | undefined;
  const lines = watched ?? [];
  const total = computeLinesTotal(lines);

  const canRemove = fields.length > minLines;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-surface',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-surface-elevated">
            <tr>
              <th className={cn(headCellClass, 'w-auto min-w-48')}>
                {intl.get('product_and_service')}
              </th>
              {showDescription && (
                <th className={cn(headCellClass, 'w-auto min-w-40')}>
                  {intl.get('description')}
                </th>
              )}
              <th className={cn(headCellClass, 'w-24 text-right')}>
                {intl.get('quantity')}
              </th>
              <th className={cn(headCellClass, 'w-32 text-right')}>
                {intl.get('rate')}
              </th>
              {showDiscount && (
                <th className={cn(headCellClass, 'w-24 text-right')}>
                  {intl.get('discount')}
                </th>
              )}
              {showTax && (
                <th className={cn(headCellClass, 'w-36')}>
                  {intl.get('line_items.tax')}
                </th>
              )}
              <th className={cn(headCellClass, 'w-32 text-right')}>
                {intl.get('total')}
              </th>
              <th className={cn(headCellClass, 'w-10')} aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={field.id} className="border-t border-border">
                <td className="px-1.5 py-1">
                  <Controller
                    control={control}
                    name={`${name}.${index}.item_id`}
                    render={({ field: itemField, fieldState }) => (
                      <Combobox
                        ref={itemField.ref}
                        items={items}
                        value={(itemField.value as string) ?? ''}
                        onChange={(next) => {
                          itemField.onChange(next);
                          onItemChange?.(index, next);
                        }}
                        placeholder={intl.get('select_product')}
                        searchPlaceholder={intl.get('search')}
                        emptyText={intl.get('no_results')}
                        className={cn(
                          cellControlClass,
                          fieldState.error && 'border-danger',
                        )}
                      />
                    )}
                  />
                </td>
                {showDescription && (
                  <td className="px-1.5 py-1">
                    <Controller
                      control={control}
                      name={`${name}.${index}.description`}
                      render={({ field: descField }) => (
                        <Input
                          ref={descField.ref}
                          name={descField.name}
                          value={(descField.value as string) ?? ''}
                          onChange={descField.onChange}
                          onBlur={descField.onBlur}
                          autoComplete="off"
                          className={cellControlClass}
                        />
                      )}
                    />
                  </td>
                )}
                <td className="px-1.5 py-1">
                  <NumericCell control={control} name={`${name}.${index}.quantity`} />
                </td>
                <td className="px-1.5 py-1">
                  <NumericCell control={control} name={`${name}.${index}.rate`} />
                </td>
                {showDiscount && (
                  <td className="px-1.5 py-1">
                    <NumericCell
                      control={control}
                      name={`${name}.${index}.discount`}
                    />
                  </td>
                )}
                {showTax && (
                  <td className="px-1.5 py-1">
                    <Controller
                      control={control}
                      name={`${name}.${index}.tax_rate_id`}
                      render={({ field: taxField, fieldState }) => (
                        <Combobox
                          ref={taxField.ref}
                          items={taxRates ?? []}
                          value={(taxField.value as string) ?? ''}
                          onChange={taxField.onChange}
                          placeholder={intl.get('line_items.select_tax_rate')}
                          searchPlaceholder={intl.get('search')}
                          emptyText={intl.get('no_results')}
                          className={cn(
                            cellControlClass,
                            fieldState.error && 'border-danger',
                          )}
                        />
                      )}
                    />
                  </td>
                )}
                <td className="whitespace-nowrap px-3 py-1 text-right tabular-nums text-text-primary">
                  {formatAmount(
                    computeLineAmount(
                      lines[index]?.quantity,
                      lines[index]?.rate,
                      lines[index]?.discount,
                    ),
                  )}
                </td>
                <td className="px-1.5 py-1 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-text-muted hover:text-danger sm:h-8 sm:w-8"
                    aria-label={intl.get('item_entries.remove_row')}
                    title={intl.get('item_entries.remove_row')}
                    disabled={!canRemove}
                    onClick={() => remove(index)}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => append({ ...emptyLineItem, ...emptyLine })}
        >
          <Plus className="h-4 w-4" aria-hidden />
          {intl.get('line_items.add_line')}
        </Button>

        <div className="flex items-baseline gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {intl.get('total')}
          </span>
          <span className="text-sm font-semibold tabular-nums text-text-primary">
            {formatAmount(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Классы заголовочной ячейки — как в data-table. */
const headCellClass =
  'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary';

/**
 * Классы контролов внутри ячеек: без собственной рамки/фона, чтобы строки
 * читались как таблица с волосяными разделителями; рамка появляется на фокусе.
 */
const cellControlClass =
  'h-9 border-transparent bg-transparent px-2 sm:h-9 hover:border-border';

/** Числовая ячейка (количество/цена): ввод вправо, tabular-nums. */
function NumericCell({
  control,
  name,
}: {
  control: Control<FieldValues>;
  name: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          ref={field.ref}
          name={field.name}
          value={(field.value as string) ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={!!fieldState.error}
          className={cn(
            cellControlClass,
            'text-right tabular-nums',
            fieldState.error && 'border-danger',
          )}
        />
      )}
    />
  );
}
