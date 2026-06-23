// @ts-nocheck
import intl from 'react-intl-universal';
import { Callout, Classes, Intent } from '@blueprintjs/core';
import { Stack } from '@/components';
import { ImportDropzone } from './ImportDropzone';
import { ImportSampleDownload } from './ImportSampleDownload';
import { ImportFileUploadForm } from './ImportFileUploadForm';
import { ImportFileUploadFooterActions } from './ImportFileFooterActions';
import { ImportFileContainer } from './ImportFileContainer';
import { useImportFileContext } from './ImportFileProvider';
import { AlertsManager, useAlertsManager } from './AlertsManager';
import { ImportAlert } from './_types';

function ImportFileUploadCallouts() {
  const { isAlertActive } = useAlertsManager();
  return (
    <>
      {isAlertActive(ImportAlert.IMPORTED_SHEET_EMPTY) && (
        <Callout intent={Intent.DANGER} icon={null}>
          {intl.get('import.upload.sheet_empty')}
        </Callout>
      )}
    </>
  );
}

export function ImportFileUploadStep() {
  const { exampleDownload } = useImportFileContext();

  return (
    <AlertsManager>
      <ImportFileUploadForm>
        <ImportFileContainer>
          <p
            className={Classes.TEXT_MUTED}
            style={{ marginBottom: 18, lineHeight: 1.6 }}
          >
            {intl.get('import.upload.sample_hint')}
          </p>

          <Stack>
            <ImportFileUploadCallouts />

            <Stack spacing={40}>
              <ImportDropzone />
              {exampleDownload && <ImportSampleDownload />}
            </Stack>
          </Stack>
        </ImportFileContainer>

        <ImportFileUploadFooterActions />
      </ImportFileUploadForm>
    </AlertsManager>
  );
}
