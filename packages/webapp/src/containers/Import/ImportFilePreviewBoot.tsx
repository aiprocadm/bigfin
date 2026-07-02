import { createContext, useContext, type ReactNode } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useImportFilePreview } from '@/hooks/query/import';

/** Строка-ошибка превью импорта (пропущенная запись). */
export interface ImportPreviewError {
  rowNumber: number | string;
  uniqueValue: string;
  errorMessage: string;
}

/** Данные превью импорта (ответ import/:id/preview в camelCase). */
export interface ImportPreviewData {
  createdCount: number;
  skippedCount: number;
  errorsCount: number;
  totalCount: number;
  unmappedColumnsCount: number;
  unmappedColumns?: string[];
  errors?: ImportPreviewError[];
  [key: string]: unknown;
}

interface ImportFilePreviewBootContextValue {
  importPreview?: ImportPreviewData;
  isImportPreviewLoading: boolean;
  isImportPreviewFetching: boolean;
}

const ImportFilePreviewBootContext =
  createContext<ImportFilePreviewBootContextValue>(
    {} as ImportFilePreviewBootContextValue,
  );

export const useImportFilePreviewBootContext = () => {
  const context = useContext<ImportFilePreviewBootContextValue>(
    ImportFilePreviewBootContext,
  );

  if (!context) {
    throw new Error(
      'useImportFilePreviewBootContext must be used within an ImportFilePreviewBootProvider',
    );
  }
  return context;
};

interface ImportFilePreviewBootProps {
  importId: string;
  children: ReactNode;
}

export const ImportFilePreviewBootProvider = ({
  importId,
  children,
}: ImportFilePreviewBootProps) => {
  const {
    data: importPreview,
    isLoading: isImportPreviewLoading,
    isFetching: isImportPreviewFetching,
  } = useImportFilePreview(importId, {
    enabled: Boolean(importId),
  });

  const value: ImportFilePreviewBootContextValue = {
    // Хук из легаси-файла без типов — приводим к известной форме локально.
    importPreview: importPreview as ImportPreviewData | undefined,
    isImportPreviewLoading,
    isImportPreviewFetching,
  };
  return (
    <ImportFilePreviewBootContext.Provider value={value}>
      {isImportPreviewLoading ? (
        <div className="flex flex-1 items-center justify-center py-16 text-text-muted">
          <Spinner size="lg" />
        </div>
      ) : (
        <>{children}</>
      )}
    </ImportFilePreviewBootContext.Provider>
  );
};
