import React from 'react';
import { AnchorButton } from '@blueprintjs/core';

import { DialogContent, PdfDocumentPreview, T } from '@/components';
import { usePdfEstimate } from '@/hooks/query';

import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { compose } from '@/utils';


/**
 * Что окно передаёт содержимому.
 *
 * Вид объявлен здесь, а не выведен: `compose(…)` отдаёт «что угодно», а
 * `React.lazy` из «что угодно» делает экран, **не принимающий свойств вовсе**.
 * Из-за этого окно не проходило проверку типов (Д3 карты v82).
 *
 * Имя `subscriptionForm` — след копирования из окна подписки; сюда приходит
 * груз окна. Переименование трогает оба файла и вынесено в задел.
 */
export interface EstimatePdfPreviewDialogContentProps {
  subscriptionForm: { estimateId: number | null };
}

function EstimatePdfPreviewDialogContent({
  subscriptionForm: { estimateId },
  dialogName,
  // #withDialogActions
  closeDialog,
}: any) {
  const { isLoading, pdfUrl, filename } = usePdfEstimate(estimateId);

  return (
    <DialogContent>
      <div className="dialog__header-actions">
        <AnchorButton
          href={pdfUrl}
          target={'__blank'}
          minimal={true}
          outlined={true}
        >
          <T id={'pdf_preview.preview.button'} />
        </AnchorButton>

        <AnchorButton
          href={pdfUrl}
          download={filename}
          minimal={true}
          outlined={true}
        >
          <T id={'pdf_preview.download.button'} />
        </AnchorButton>
      </div>

      <PdfDocumentPreview
        height={760}
        width={1000}
        isLoading={isLoading}
        url={pdfUrl}
      />
    </DialogContent>
  );
}

const EstimatePdfPreviewDialogContentComposed: React.ComponentType<EstimatePdfPreviewDialogContentProps> =
  compose(withDialogActions)(EstimatePdfPreviewDialogContent);

export default EstimatePdfPreviewDialogContentComposed;
