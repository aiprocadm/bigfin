import React from 'react';
import { AnchorButton } from '@blueprintjs/core';

import { DialogContent, PdfDocumentPreview, T } from '@/components';
import { usePdfPaymentReceive } from '@/hooks/query';

import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { compose } from '@/utils';


/**
 * Что окно передаёт содержимому.
 *
 * Вид объявлен здесь, а не выведен: `compose(…)` отдаёт «что угодно», а
 * `React.lazy` из «что угодно» делает экран, **не принимающий свойств вовсе**.
 * Из-за этого окно не проходило проверку типов (Д3 карты v82).
 *
 * Раньше номер приходил внутри объекта `subscriptionForm` — след копирования
 * из окна подписки, висел в заделе с карты v82. Теперь содержимое получает
 * номер напрямую (Д9 карты v85).
 */
export interface PaymentReceivePdfPreviewDialogContentProps {
  paymentReceiveId: number | null;
}

function PaymentReceivePdfPreviewDialogContent({
  paymentReceiveId,
}: PaymentReceivePdfPreviewDialogContentProps) {
  const { isLoading, pdfUrl, filename } = usePdfPaymentReceive(paymentReceiveId);

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

const PaymentReceivePdfPreviewDialogContentComposed: React.ComponentType<PaymentReceivePdfPreviewDialogContentProps> =
  compose(withDialogActions)(PaymentReceivePdfPreviewDialogContent);

export default PaymentReceivePdfPreviewDialogContentComposed;
