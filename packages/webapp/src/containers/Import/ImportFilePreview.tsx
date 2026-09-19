import { useMemo, useState, type ReactNode } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { AppToaster } from '@/components';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Spinner } from '@/components/ui/Spinner';
import { useImportFileProcess } from '@/hooks/query/import';
import {
  ImportFilePreviewBootProvider,
  useImportFilePreviewBootContext,
  type ImportPreviewError,
} from './ImportFilePreviewBoot';
import { useImportFileContext } from './ImportFileProvider';
import { ImportFileContainer } from './ImportFileContainer';
import { ImportStepperStep } from './_types';

/** Шаг 3 мастера импорта — превью результата перед запуском импорта. */
export function ImportFilePreview() {
  const { importId } = useImportFileContext();

  return (
    <ImportFilePreviewBootProvider importId={importId}>
      <ImportFilePreviewContent />
    </ImportFilePreviewBootProvider>
  );
}

function ImportFilePreviewContent() {
  const { importPreview } = useImportFilePreviewBootContext();

  if (!importPreview) {
    return null;
  }
  return (
    <div className="flex flex-1 flex-col">
      <ImportFileContainer>
        <div className="flex flex-col gap-4">
          <Alert
            variant={importPreview.createdCount <= 0 ? 'destructive' : 'default'}
          >
            <AlertDescription>
              {intl.get('import.preview.ready_summary', {
                created: importPreview.createdCount,
                total: importPreview.totalCount,
              })}
            </AlertDescription>
          </Alert>

          <ImportFilePreviewImported />
          <ImportFilePreviewSkipped />
          <ImportFilePreviewUnmapped />
        </div>
      </ImportFileContainer>
      <ImportFilePreviewFloatingActions />
    </div>
  );
}

interface PreviewSectionProps {
  title: string;
  collapsible?: boolean;
  children: ReactNode;
}

/**
 * Секция превью: карточка с заголовком; при collapsible — свёрнута
 * по умолчанию (как в легаси), разворачивается по клику.
 */
function PreviewSection({
  title,
  collapsible = false,
  children,
}: PreviewSectionProps) {
  const [isOpen, setIsOpen] = useState(!collapsible);

  return (
    <section className="overflow-hidden rounded-default border border-border bg-surface">
      {collapsible ? (
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-text-primary hover:bg-surface-elevated"
        >
          {title}
          {isOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
          )}
        </button>
      ) : (
        <h3 className="px-4 py-3 text-sm font-medium text-text-primary">
          {title}
        </h3>
      )}

      {isOpen && (
        <div className="border-t border-border px-4 py-4">{children}</div>
      )}
    </section>
  );
}

/** Карточка «готово к импорту»: сколько записей создадим/пропустим/с ошибками. */
function ImportFilePreviewImported() {
  const { importPreview } = useImportFilePreviewBootContext();

  if (!importPreview) return null;

  const counts = [
    {
      label: intl.get('import.preview.to_create'),
      value: importPreview.createdCount,
    },
    {
      label: intl.get('import.preview.to_skip'),
      value: importPreview.skippedCount,
    },
    {
      label: intl.get('import.preview.with_errors'),
      value: importPreview.errorsCount,
    },
  ];

  return (
    <PreviewSection
      title={intl.get('import.preview.ready_title', {
        count: importPreview.createdCount,
      })}
    >
      <p className="text-sm text-text-secondary">
        {intl.get('import.preview.ready_text', {
          count: importPreview.createdCount,
        })}
      </p>
      <ul className="mt-3 flex flex-col text-sm">
        {counts.map((count) => (
          <li
            key={count.label}
            className="flex items-center justify-between border-t border-border py-1.5 first:border-t-0"
          >
            <span className="text-text-secondary">{count.label}</span>
            <span className="tabular-nums font-medium text-text-primary">
              {count.value}
            </span>
          </li>
        ))}
      </ul>
    </PreviewSection>
  );
}

type SkippedRow = ImportPreviewError & { __id: string };

/** Свёрнутая секция пропущенных строк: таблица «строка — значение — ошибка». */
function ImportFilePreviewSkipped() {
  const { importPreview } = useImportFilePreviewBootContext();

  const rows = useMemo<SkippedRow[]>(
    () =>
      (importPreview?.errors ?? []).map((error, index) => ({
        ...error,
        __id: String(index),
      })),
    [importPreview?.errors],
  );
  const columns = useMemo(
    () => [
      {
        id: 'rowNumber',
        Header: intl.get('import.preview.column.row'),
        accessor: 'rowNumber',
      },
      {
        id: 'uniqueValue',
        Header: intl.get('value'),
        accessor: 'uniqueValue',
      },
      {
        id: 'errorMessage',
        Header: intl.get('import.preview.column.error'),
        accessor: 'errorMessage',
      },
    ],
    [],
  );
  // Нечего показывать, если нет пропущенных записей.
  if (!importPreview || importPreview.skippedCount <= 0) return null;

  return (
    <PreviewSection
      collapsible
      title={intl.get('import.preview.skipped_title', {
        count: importPreview.skippedCount,
      })}
    >
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row: SkippedRow) => row.__id}
      />
    </PreviewSection>
  );
}

/** Свёрнутая секция столбцов файла, не сопоставленных ни с одним полем. */
function ImportFilePreviewUnmapped() {
  const { importPreview } = useImportFilePreviewBootContext();

  // Нечего показывать, если все столбцы сопоставлены.
  if (!importPreview || importPreview.unmappedColumnsCount <= 0) return null;

  return (
    <PreviewSection
      collapsible
      title={intl.get('import.preview.unmapped_title', {
        count: importPreview.unmappedColumnsCount,
      })}
    >
      <ul className="flex flex-col text-sm text-text-primary">
        {(importPreview.unmappedColumns ?? []).map((column, index) => (
          <li
            key={index}
            className="border-t border-border py-1.5 first:border-t-0"
          >
            {column}
          </li>
        ))}
      </ul>
    </PreviewSection>
  );
}

/** Панель действий превью: «Отмена» (назад) + primary «Импортировать». */
function ImportFilePreviewFloatingActions() {
  const { importId, setStep, onImportSuccess, onImportFailed } =
    useImportFileContext();
  const { importPreview } = useImportFilePreviewBootContext();
  // Легаси-хук без типов (TVariables=void) — уточняем сигнатуру локально.
  const { mutateAsync: importFileMutate, isLoading: isImportFileLoading } =
    useImportFileProcess({});
  const importFile = importFileMutate as unknown as (
    importId: string,
  ) => Promise<unknown>;

  const isValidToImport = (importPreview?.createdCount ?? 0) > 0;

  const handleSubmitBtn = () => {
    importFile(importId)
      .then(() => {
        AppToaster.show({
          intent: Intent.SUCCESS,
          message: intl.get('import.preview.success', {
            count: importPreview?.createdCount ?? 0,
          }),
        });
        onImportSuccess?.();
      })
      .catch(() => {
        onImportFailed?.();
      });
  };
  const handleCancelBtnClick = () => {
    setStep(ImportStepperStep.Mapping);
  };

  return (
    <div className="sticky bottom-0 z-10 border-t border-border bg-surface px-4 py-3 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={handleCancelBtnClick}>
          {intl.get('cancel')}
        </Button>
        <Button
          type="button"
          onClick={handleSubmitBtn}
          disabled={!isValidToImport || isImportFileLoading}
        >
          {isImportFileLoading && <Spinner size="sm" />}
          {intl.get('import')}
        </Button>
      </div>
    </div>
  );
}
