import intl from 'react-intl-universal';
import { Stack } from '@/components';
import { Classes } from '@blueprintjs/core';
import { SendMailViewHeader } from '../../Estimates/SendMailViewDrawer/SendMailViewHeader';
import { SendMailViewLayout } from '../../Estimates/SendMailViewDrawer/SendMailViewLayout';
import { CreditNoteSendMailBoot } from './CreditNoteSendMailBoot';
import { CreditNoteSendMailForm } from './CreditNoteSendMailForm';
import { CreditNoteSendMailFormFields } from './CreditNoteSendMailFormFields';
import { CreditNoteSendMailPreviewTabs } from './CreditNoteSendMailPreviewTabs';

export function CreditNoteSendMailContent() {
  return (
    <Stack className={Classes.DRAWER_BODY}>
      <CreditNoteSendMailBoot>
        <CreditNoteSendMailForm>
          <SendMailViewLayout
            header={
              <SendMailViewHeader
                label={intl.get('credit_note.send_mail.drawer.title')}
              />
            }
            fields={<CreditNoteSendMailFormFields />}
            preview={<CreditNoteSendMailPreviewTabs />}
          />
        </CreditNoteSendMailForm>
      </CreditNoteSendMailBoot>
    </Stack>
  );
}
