import { useMemo } from 'react';
import intl from 'react-intl-universal';
import { Field, useFormikContext, type FieldProps } from 'formik';
import { HelpCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/Spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ImportFileMappingForm } from './ImportFileMappingForm';
import { EntityColumnField, useImportFileContext } from './ImportFileProvider';
import { ImportFileContainer } from './ImportFileContainer';
import { ImportFileMapBootProvider } from './ImportFileMappingBoot';
import { ImportStepperStep } from './_types';
import { getFieldKey } from './_utils';

/**
 * Radix Select не допускает пустое значение item'а, а «не сопоставлено»
 * в форме хранится как ''. Сентинел конвертируется в '' при выборе.
 */
const UNMAPPED_VALUE = '__unmapped__';

/** Шаг 2 мастера импорта — сопоставление столбцов файла с полями Bigfin. */
export function ImportFileMapping() {
  const { importId, entityColumns } = useImportFileContext();

  return (
    <ImportFileMapBootProvider importId={importId}>
      <ImportFileMappingForm>
        <ImportFileContainer>
          <p className="mb-5 text-sm leading-relaxed text-text-secondary">
            {intl.get('import.mapping.description')}
          </p>

          <div className="flex flex-col gap-4">
            {entityColumns.map((entityColumn, index) => (
              <ImportFileMappingGroup
                key={entityColumn.groupKey || String(index)}
                groupLabel={entityColumn.groupLabel}
                fields={entityColumn.fields}
              />
            ))}
          </div>
        </ImportFileContainer>
        <ImportFileMappingFloatingActions />
      </ImportFileMappingForm>
    </ImportFileMapBootProvider>
  );
}

interface ImportFileMappingGroupProps {
  groupLabel: string;
  fields: EntityColumnField[];
}

/** Карточка-группа полей сопоставления. */
function ImportFileMappingGroup({
  groupLabel,
  fields,
}: ImportFileMappingGroupProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      {groupLabel && (
        <h3 className="border-b border-border px-4 py-3 text-sm font-medium text-text-primary">
          {groupLabel}
        </h3>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-elevated">
              <th className="w-1/2 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {intl.get('import.mapping.column.bigfin_fields')}
              </th>
              <th className="w-1/2 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {intl.get('import.mapping.column.sheet_headers')}
              </th>
            </tr>
          </thead>
          <tbody>
            {fields.map((column) => (
              <ImportFileMappingFieldRow
                key={getFieldKey(column.key, column.group)}
                column={column}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface ImportFileMappingFieldRowProps {
  column: EntityColumnField;
}

/** Строка сопоставления: поле Bigfin слева, Select столбца файла справа. */
function ImportFileMappingFieldRow({ column }: ImportFileMappingFieldRowProps) {
  const { sheetColumns } = useImportFileContext();
  const name = getFieldKey(column.key, column.group);

  // Пустые заголовки столбцов не сопоставить (и Radix запрещает value='').
  const items = useMemo(
    () => sheetColumns.filter((sheetColumn) => sheetColumn !== ''),
    [sheetColumns],
  );

  return (
    <tr className="border-t border-border">
      <td className="px-4 py-2 align-middle text-text-primary">
        <span className="inline-flex items-center gap-1.5">
          {column.name}
          {column.required && (
            <span className="text-danger" aria-hidden>
              *
            </span>
          )}
          {column.hint && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={column.hint}
                    className="inline-flex text-text-muted hover:text-text-secondary"
                  >
                    <HelpCircle className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </TooltipTrigger>
                {/* Контент в портале вне .bigfin-ui — класс нужен для шрифта/сброса. */}
                <TooltipContent side="bottom" className="bigfin-ui max-w-xs">
                  {column.hint}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </span>
      </td>
      <td className="px-4 py-2">
        <Field name={name}>
          {({ field, form }: FieldProps) => (
            <Select
              value={field.value ? String(field.value) : UNMAPPED_VALUE}
              onValueChange={(value) =>
                form.setFieldValue(
                  name,
                  value === UNMAPPED_VALUE ? '' : value,
                )
              }
            >
              <SelectTrigger className="h-9 sm:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNMAPPED_VALUE}>
                  <span className="text-text-muted">
                    {intl.get('import.mapping.not_mapped')}
                  </span>
                </SelectItem>
                {items.map((sheetColumn) => (
                  <SelectItem key={sheetColumn} value={sheetColumn}>
                    {sheetColumn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      </td>
    </tr>
  );
}

/** Панель действий шага сопоставления: «Назад» + primary «Далее» (submit). */
function ImportFileMappingFloatingActions() {
  const { isSubmitting } = useFormikContext<any>();
  const { setStep } = useImportFileContext();

  const handleCancelBtnClick = () => {
    setStep(ImportStepperStep.Upload);
  };

  return (
    <div className="sticky bottom-0 z-10 border-t border-border bg-surface px-4 py-3 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={handleCancelBtnClick}
          disabled={isSubmitting}
        >
          {intl.get('back')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner size="sm" />}
          {intl.get('next')}
        </Button>
      </div>
    </div>
  );
}
