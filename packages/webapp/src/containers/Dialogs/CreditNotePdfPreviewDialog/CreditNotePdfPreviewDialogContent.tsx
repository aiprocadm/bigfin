import React from 'react';
import { AnchorButton } from '@blueprintjs/core';

import { DialogContent, PdfDocumentPreview, T } from '@/components';
import { usePdfCreditNote } from '@/hooks/query';

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
export interface CreditNotePdfPreviewDialogContentProps {
  subscriptionForm: { creditNoteId: number | null };
}

function CreditNotePdfPreviewDialogContent({
  subscriptionForm: { creditNoteId },
}: CreditNotePdfPreviewDialogContentProps) {
  const { isLoading, pdfUrl, filename } = usePdfCreditNote(creditNoteId);

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

const CreditNotePdfPreviewDialogContentComposed: React.ComponentType<CreditNotePdfPreviewDialogContentProps> =
  compose(withDialogActions)(CreditNotePdfPreviewDialogContent);

export default CreditNotePdfPreviewDialogContentComposed;
