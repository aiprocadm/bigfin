import { useFormikContext } from 'formik';
import { SendViewPreviewHeader } from '../../Estimates/SendMailViewDrawer/SendMailViewPreviewHeader';
import { useSendCreditNoteMailSubject } from './_hooks';
import { useCreditNoteSendMailBoot } from './CreditNoteSendMailBoot';
import { CreditNoteSendMailFormValues } from './_types';

export function CreditNoteSendMailPreviewHeader() {
  const subject = useSendCreditNoteMailSubject();
  const { creditNoteMailState } = useCreditNoteSendMailBoot();
  const {
    values: { to, from },
  } = useFormikContext<CreditNoteSendMailFormValues>();

  return (
    <SendViewPreviewHeader
      companyName={creditNoteMailState?.companyName || ''}
      customerName={creditNoteMailState?.customerName || ''}
      subject={subject}
      from={from}
      to={to}
    />
  );
}
