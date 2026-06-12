import intl from 'react-intl-universal';
import { lazy, Suspense } from 'react';
import { Tab } from '@blueprintjs/core';
import { SendMailViewPreviewTabs } from '../../Estimates/SendMailViewDrawer/SendMailViewPreviewTabs';

const PaymentReceivedMailPreviewReceipt = lazy(() =>
  import('./PaymentReceivedMailPreviewReceipt').then((module) => ({
    default: module.PaymentReceivedMailPreviewReceipt,
  })),
);
const PaymentReceivedSendMailPreviewPdf = lazy(() =>
  import('./PaymentReceivedMailPreviewPdf').then((module) => ({
    default: module.PaymentReceivedSendMailPreviewPdf,
  })),
);

export function PaymentReceivedSendMailPreview() {
  return (
    <SendMailViewPreviewTabs>
      <Tab
        id={'payment-page'}
        title={intl.get('preview.payment_page')}
        panel={
          <Suspense>
            <PaymentReceivedMailPreviewReceipt />
          </Suspense>
        }
      />
      <Tab
        id="pdf-document"
        title={intl.get('preview.pdf_document')}
        panel={
          <Suspense>
            <PaymentReceivedSendMailPreviewPdf />
          </Suspense>
        }
      />
    </SendMailViewPreviewTabs>
  );
}
