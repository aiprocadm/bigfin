import React from 'react';
import { AnchorButton } from '@blueprintjs/core';

import { DialogContent, PdfDocumentPreview, T } from '@/components';
import { usePdfInvoice } from '@/hooks/query';

import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { compose } from '@/utils';

/**
 * Что окно передаёт содержимому.
 *
 * Вид объявлен здесь, а не выведен: сборка отдаёт «что угодно», а `React.lazy`
 * из «что угодно» делает экран, **не принимающий свойств вовсе** (Д4 карты v84,
 * тот же случай, что в карте v82).
 */
export interface InvoicePdfPreviewDialogContentProps {
  /**
   * Раньше номер приходил внутри объекта `subscriptionForm` — след
   * копирования из окна подписки, висел в заделе с карты v82. Теперь
   * содержимое получает номер напрямую (Д9 карты v85).
   */
  invoiceId: number | null;
}

function InvoicePdfPreviewDialogContent({
  invoiceId,
  // #withDialog
  closeDialog,
}: any) {
  const { isLoading, pdfUrl, filename } = usePdfInvoice(invoiceId);

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

const InvoicePdfPreviewDialogContentComposed: React.ComponentType<InvoicePdfPreviewDialogContentProps> =
  compose(withDialogActions)(InvoicePdfPreviewDialogContent);

export default InvoicePdfPreviewDialogContentComposed;
