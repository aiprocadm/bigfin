import intl from 'react-intl-universal';
import * as Yup from 'yup';
import * as R from 'ramda';
import { Button, Classes, Intent } from '@blueprintjs/core';
import { Form, Formik, FormikHelpers, useFormikContext } from 'formik';
import { FormatNumber } from '@/components';
import { usePaymentReceiveFormContext } from '../../PaymentReceiveFormProvider';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { usePaymentReceivedTotalExceededAmount } from '../../utils';

interface ExcessPaymentValues {}

export function ExcessPaymentDialogContentRoot({ dialogName, closeDialog }: any) {
  const {
    submitForm,
    values: { currency_code: currencyCode },
  } = useFormikContext<any>();
  const { setIsExcessConfirmed } = usePaymentReceiveFormContext();
  const exceededAmount = usePaymentReceivedTotalExceededAmount();

  const handleSubmit = (
    values: ExcessPaymentValues,
    { setSubmitting }: FormikHelpers<ExcessPaymentValues>,
  ) => {
    setSubmitting(true);
    setIsExcessConfirmed(true);

    submitForm().then(() => {
      closeDialog(dialogName);
      setSubmitting(false);
    });
  };
  const handleClose = () => {
    closeDialog(dialogName);
  };

  return (
    <Formik initialValues={{}} onSubmit={handleSubmit}>
      <Form>
        <ExcessPaymentDialogContentForm
          exceededAmount={
            <FormatNumber value={exceededAmount} currency={currencyCode} />
          }
          onClose={handleClose}
        />
      </Form>
    </Formik>
  );
}

export const ExcessPaymentDialogContent = R.compose(withDialogActions)(
  ExcessPaymentDialogContentRoot,
);

function ExcessPaymentDialogContentForm({ onClose, exceededAmount }: any) {
  const { submitForm, isSubmitting } = useFormikContext<any>();

  const handleCloseBtn = () => {
    onClose && onClose();
  };

  return (
    <>
      <div className={Classes.DIALOG_BODY}>
        <p style={{ marginBottom: 20 }}>
          {intl.get('payment_receive_form.excess_payment.question', {
            amount: exceededAmount,
          })}
        </p>
      </div>

      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
            intent={Intent.PRIMARY}
            loading={isSubmitting}
            disabled={isSubmitting}
            onClick={() => submitForm()}
          >
            {intl.get('excess_payment.action.save_as_credit')}
          </Button>
          <Button onClick={handleCloseBtn}>{intl.get('cancel')}</Button>
        </div>
      </div>
    </>
  );
}
