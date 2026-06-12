import intl from 'react-intl-universal';
import { Stack } from '@/components';
import { Classes } from '@blueprintjs/core';
import { InvoiceSendMailBoot } from './InvoiceSendMailContentBoot';
import { InvoiceSendMailForm } from './InvoiceSendMailForm';
import { InvoiceSendMailPreview } from './InvoiceSendMailPreview';
import { InvoiceSendMailFields } from './InvoiceSendMailFields';
import { SendMailViewHeader } from '../../Estimates/SendMailViewDrawer/SendMailViewHeader';
import { SendMailViewLayout } from '../../Estimates/SendMailViewDrawer/SendMailViewLayout';

export function InvoiceSendMailContent() {
  return (
    <Stack className={Classes.DRAWER_BODY}>
      <InvoiceSendMailBoot>
        <InvoiceSendMailForm>
          <SendMailViewLayout
            header={<SendMailViewHeader label={intl.get('invoice.send_mail.drawer.title')} />}
            fields={<InvoiceSendMailFields />}
            preview={<InvoiceSendMailPreview />}
          />
        </InvoiceSendMailForm>
      </InvoiceSendMailBoot>
    </Stack>
  );
}
