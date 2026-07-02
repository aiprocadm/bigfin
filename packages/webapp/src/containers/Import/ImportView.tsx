import { ImportStepper } from './ImportStepper';
import { ImportFileProvider } from './ImportFileProvider';

interface ImportViewProps {
  resource: string;
  description?: string;
  params?: Record<string, any>;
  onImportSuccess?: () => void;
  onImportFailed?: () => void;
  onCancelClick?: () => void;
  sampleFileName?: string;
  exampleDownload?: boolean;
  exampleTitle?: string;
  exampleDescription?: string;
}

/**
 * Мастер импорта CSV/XLSX (shadcn). Механизм прежний:
 * контекст ImportFileProvider + три шага (загрузка → сопоставление → результат).
 */
export function ImportView({ ...props }: ImportViewProps) {
  return (
    <div className="bigfin-ui flex min-h-full flex-1 flex-col bg-background">
      <ImportFileProvider {...props}>
        <ImportStepper />
      </ImportFileProvider>
    </div>
  );
}
