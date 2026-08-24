import intl from 'react-intl-universal';
import { lazy, Suspense } from 'react';
import { Tab } from '@blueprintjs/core';
import { SendMailViewPreviewTabs } from '../../Estimates/SendMailViewDrawer/SendMailViewPreviewTabs';

const CreditNoteSendMailPreview = lazy(() =>
  import('./CreditNoteSendMailPreview').then((module) => ({
    default: module.CreditNoteSendMailPreview,
  })),
);
const CreditNoteSendMailPdfPreview = lazy(() =>
  import('./CreditNoteSendMailPdfPreview').then((module) => ({
    default: module.CreditNoteSendMailPdfPreview,
  })),
);

export function CreditNoteSendMailPreviewTabs() {
  return (
    <SendMailViewPreviewTabs>
      <Tab
        id={'payment-page'}
        title={intl.get('preview.email_receipt')}
        panel={
          <Suspense>
            <CreditNoteSendMailPreview />
          </Suspense>
        }
      />
      <Tab
        id="pdf-document"
        title={intl.get('preview.pdf_document')}
        panel={
          <Suspense>
            <CreditNoteSendMailPdfPreview />
          </Suspense>
        }
      />
    </SendMailViewPreviewTabs>
  );
}
