import intl from 'react-intl-universal';
import { Stack } from '@/components';
import { Classes } from '@blueprintjs/core';
import { SendMailViewHeader } from '../../Estimates/SendMailViewDrawer/SendMailViewHeader';
import { SendMailViewLayout } from '../../Estimates/SendMailViewDrawer/SendMailViewLayout';
import { ReceiptSendMailBoot } from './ReceiptSendMailBoot';
import { ReceiptSendMailForm } from './ReceiptSendMailForm';
import { ReceiptSendMailFormFields } from './ReceiptSendMailFormFields';
import { ReceiptSendMailPreviewTabs } from './ReceiptSendMailPreviewTabs';

export function ReceiptSendMailContent() {
  return (
    <Stack className={Classes.DRAWER_BODY}>
      <ReceiptSendMailBoot>
        <ReceiptSendMailForm>
          <SendMailViewLayout
            header={<SendMailViewHeader label={intl.get('receipt.send_mail.drawer.title')} />}
            fields={<ReceiptSendMailFormFields />}
            preview={<ReceiptSendMailPreviewTabs />}
          />
        </ReceiptSendMailForm>
      </ReceiptSendMailBoot>
    </Stack>
  );
}
