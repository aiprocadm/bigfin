import intl from 'react-intl-universal';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImportDropzone } from './ImportDropzone';
import { ImportSampleDownload } from './ImportSampleDownload';
import { ImportFileUploadForm } from './ImportFileUploadForm';
import { ImportFileUploadFooterActions } from './ImportFileFooterActions';
import { ImportFileContainer } from './ImportFileContainer';
import { useImportFileContext } from './ImportFileProvider';
import { AlertsManager, useAlertsManager } from './AlertsManager';
import { ImportAlert } from './_types';

/** Ошибка «пустой лист» после попытки загрузки файла. */
function ImportFileUploadAlerts() {
  const { isAlertActive } = useAlertsManager();

  if (!isAlertActive(ImportAlert.IMPORTED_SHEET_EMPTY)) {
    return null;
  }
  return (
    <Alert variant="destructive">
      <AlertDescription>{intl.get('import.upload.sheet_empty')}</AlertDescription>
    </Alert>
  );
}

/** Шаг 1 мастера импорта — загрузка CSV/XLSX-файла. */
export function ImportFileUploadStep() {
  const { exampleDownload } = useImportFileContext();

  return (
    <AlertsManager>
      <ImportFileUploadForm>
        <ImportFileContainer>
          <p className="mb-5 text-sm leading-relaxed text-text-secondary">
            {intl.get('import.upload.sample_hint')}
          </p>

          <div className="flex flex-col gap-4">
            <ImportFileUploadAlerts />

            <div className="flex flex-col gap-8">
              <ImportDropzone />
              {exampleDownload && <ImportSampleDownload />}
            </div>
          </div>
        </ImportFileContainer>

        <ImportFileUploadFooterActions />
      </ImportFileUploadForm>
    </AlertsManager>
  );
}
