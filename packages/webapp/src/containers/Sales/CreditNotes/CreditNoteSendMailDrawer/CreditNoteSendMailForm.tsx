import intl from 'react-intl-universal';
import { Form, Formik, FormikHelpers } from 'formik';
import { css } from '@emotion/css';
import { Intent } from '@blueprintjs/core';
import { CreditNoteSendMailFormValues } from './_types';
import { getCreditNoteSendMailFormSchema } from './CreditNoteSendMailForm.schema';
import { useSendCreditNoteMail } from '@/hooks/query';
import { AppToaster } from '@/components';
import { useCreditNoteSendMailBoot } from './CreditNoteSendMailBoot';
import { useDrawerActions } from '@/hooks/state';
import { useDrawerContext } from '@/components/Drawer/DrawerProvider';
import { transformToForm } from '@/utils';

const initialValues: CreditNoteSendMailFormValues = {
  subject: '',
  message: '',
  to: [],
  cc: [],
  bcc: [],
  attachPdf: true,
};

interface CreditNoteSendMailFormProps {
  children: React.ReactNode;
}

export function CreditNoteSendMailForm({
  children,
}: CreditNoteSendMailFormProps) {
  const { mutateAsync: sendCreditNoteMail } = useSendCreditNoteMail();
  const { creditNoteId, creditNoteMailState } = useCreditNoteSendMailBoot();

  const { name } = useDrawerContext();
  const { closeDrawer } = useDrawerActions();

  const _initialValues: CreditNoteSendMailFormValues = {
    ...initialValues,
    ...transformToForm(creditNoteMailState, initialValues),
  };
  const handleSubmit = (
    values: CreditNoteSendMailFormValues,
    { setSubmitting }: FormikHelpers<CreditNoteSendMailFormValues>,
  ) => {
    setSubmitting(true);
    sendCreditNoteMail([creditNoteId, values])
      .then(() => {
        AppToaster.show({
          message: intl.get('credit_note.send_mail.success_message'),
          intent: Intent.SUCCESS,
        });
        setSubmitting(false);
        closeDrawer(name);
      })
      .catch(() => {
        setSubmitting(false);
        AppToaster.show({
          message: intl.get('something_went_wrong'),
          // Ошибка — это ошибка: у чека здесь стоял SUCCESS, письмо
          // «падало» зелёной плашкой. Не повторяем (Р3б v18).
          intent: Intent.DANGER,
        });
      });
  };

  return (
    <Formik
      initialValues={_initialValues}
      validationSchema={getCreditNoteSendMailFormSchema()}
      onSubmit={handleSubmit}
    >
      <Form
        className={css`
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        `}
      >
        {children}
      </Form>
    </Formik>
  );
}
