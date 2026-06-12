import intl from 'react-intl-universal';
import { lazy, Suspense } from 'react';
import { Tab } from '@blueprintjs/core';
import { SendMailViewPreviewTabs } from '../../Estimates/SendMailViewDrawer/SendMailViewPreviewTabs';

const ReceiptSendMailPreview = lazy(() =>
  import('./ReceiptSendMailPreview').then((module) => ({
    default: module.ReceiptSendMailPreview,
  })),
);
const ReceiptSendMailPdfPreview = lazy(() =>
  import('./ReceiptSendMailPdfPreview').then((module) => ({
    default: module.ReceiptSendMailPdfPreview,
  })),
);

export function ReceiptSendMailPreviewTabs() {
  return (
    <SendMailViewPreviewTabs>
      <Tab
        id={'payment-page'}
        title={intl.get('preview.payment_page')}
        panel={
          <Suspense>
            <ReceiptSendMailPreview />
          </Suspense>
        }
      />
      <Tab
        id="pdf-document"
        title={intl.get('preview.pdf_document')}
        panel={
          <Suspense>
            <ReceiptSendMailPdfPreview />
          </Suspense>
        }
      />
    </SendMailViewPreviewTabs>
  );
}
