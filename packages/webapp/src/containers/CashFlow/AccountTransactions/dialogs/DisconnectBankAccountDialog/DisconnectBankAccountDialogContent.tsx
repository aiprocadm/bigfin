import intl from 'react-intl-universal';
import type React from 'react';
import { compose } from '@/utils';
import * as Yup from 'yup';
import { Button, Intent, Classes } from '@blueprintjs/core';
import { Form, Formik, FormikHelpers } from 'formik';
import { AppToaster, FFormGroup, FInputGroup } from '@/components';
import { useDisconnectBankAccount } from '@/hooks/query/bank-rules';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { DialogsName } from '@/constants/dialogs';
import { showApiError } from '@/utils/showApiError';

interface DisconnectFormValues {
  label: string;
}

const initialValues = {
  label: '',
};

// Схема строится при вызове: словарь к моменту импорта модуля ещё не загружен.
const getSchema = () =>
  Yup.object().shape({
    label: Yup.string()
      .required()
      .label(intl.get('banking.disconnect.confirmation_label')),
  });

interface DisconnectBankAccountDialogContentProps {
  bankAccountId: number;
  /** Подставляет обёртка `withDialogActions` — объявить всё равно надо. */
  closeDialog: (name: string) => void;
}

function DisconnectBankAccountDialogContent({
  bankAccountId,

  // #withDialogActions
  closeDialog,
}: DisconnectBankAccountDialogContentProps) {
  const { mutateAsync: disconnectBankAccount } = useDisconnectBankAccount();

  const handleSubmit = (
    values: DisconnectFormValues,
    { setErrors, setSubmitting }: FormikHelpers<DisconnectFormValues>,
  ) => {
    setSubmitting(true);

    if (values.label !== intl.get('banking.disconnect.phrase')) {
      setErrors({
        label: intl.get('banking.disconnect.value_incorrect'),
      });
      setSubmitting(false);
      return;
    }
    disconnectBankAccount({ bankAccountId })
      .then(() => {
        setSubmitting(false);
        AppToaster.show({
          message: intl.get('cashflow.notify.bank_account_disconnected'),
          intent: Intent.SUCCESS,
        });
        closeDialog(DialogsName.DisconnectBankAccountConfirmation);
      })
      .catch((error) => {
        setSubmitting(false);
        showApiError(error);
      });
  };

  const handleCancelBtnClick = () => {
    closeDialog(DialogsName.DisconnectBankAccountConfirmation);
  };

  return (
    <Formik
      onSubmit={handleSubmit}
      validationSchema={getSchema()}
      initialValues={initialValues}
    >
      <Form>
        <div className={Classes.DIALOG_BODY}>
          <FFormGroup
            label={intl.get('banking.disconnect.type_phrase', {
              phrase: intl.get('banking.disconnect.phrase'),
            })}
            name={'label'}
          >
            <FInputGroup name={'label'} fastField />
          </FFormGroup>
        </div>

        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button type="submit" intent={Intent.DANGER}>
              {intl.get('cashflow.dialog.disconnect_bank_account')}
            </Button>

            <Button intent={Intent.NONE} onClick={handleCancelBtnClick}>
              {intl.get('cancel')}
            </Button>
          </div>
        </div>
      </Form>
    </Formik>
  );
}

const DisconnectBankAccountDialogContentComposed: React.ComponentType<{
  bankAccountId: number | null;
}> = compose(withDialogActions)(DisconnectBankAccountDialogContent);

export default DisconnectBankAccountDialogContentComposed;
