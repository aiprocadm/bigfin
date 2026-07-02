import { createContext, useContext, type ReactNode } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useImportFileMeta } from '@/hooks/query/import';

/** Метаданные загруженного файла импорта (map используется в _utils). */
export interface ImportFileMetaData {
  map?: { from: string; to: string; group: string }[];
  [key: string]: unknown;
}

interface ImportFileMapBootContextValue {
  importFile?: ImportFileMetaData;
  isImportFileLoading: boolean;
  isImportFileFetching: boolean;
}

const ImportFileMapBootContext = createContext<ImportFileMapBootContextValue>(
  {} as ImportFileMapBootContextValue,
);

export const useImportFileMapBootContext = () => {
  const context = useContext<ImportFileMapBootContextValue>(
    ImportFileMapBootContext,
  );

  if (!context) {
    throw new Error(
      'useImportFileMapBootContext must be used within an ImportFileMapBootProvider',
    );
  }
  return context;
};

interface ImportFileMapBootProps {
  importId: string;
  children: ReactNode;
}

export const ImportFileMapBootProvider = ({
  importId,
  children,
}: ImportFileMapBootProps) => {
  const {
    data: importFile,
    isLoading: isImportFileLoading,
    isFetching: isImportFileFetching,
  } = useImportFileMeta(importId, {
    enabled: Boolean(importId),
  });

  const value: ImportFileMapBootContextValue = {
    // Хук из легаси-файла без типов — приводим к известной форме локально.
    importFile: importFile as ImportFileMetaData | undefined,
    isImportFileLoading,
    isImportFileFetching,
  };
  return (
    <ImportFileMapBootContext.Provider value={value}>
      {isImportFileLoading ? (
        <div className="flex flex-1 items-center justify-center py-16 text-text-muted">
          <Spinner size="lg" />
        </div>
      ) : (
        <>{children}</>
      )}
    </ImportFileMapBootContext.Provider>
  );
};
