import React from 'react';
import intl from 'react-intl-universal';
import { useSaveSettings } from '@/hooks/query';

import { TransactionNumberDialogProvider } from './TransactionNumberDialogProvider';
import ReferenceNumberForm from '@/containers/JournalNumber/ReferenceNumberForm';

import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withSettings } from '@/containers/Settings/withSettings';
import { withSettingsActions } from '@/containers/Settings/withSettingsActions';
import {
  transformFormToSettings,
  transformSettingsToForm,
} from '@/containers/JournalNumber/utils';
import type {
  NumberDialogContentProps,
  NumberSettingsGroup,
  ReferenceNumberFormValues,
  ReferenceNumberSubmitHandler,
} from '@/containers/JournalNumber/types';
import { compose } from '@/utils';

/**
 * Transaction number dialog content.
 */
function TransactionNumberDialogContent({
  // #ownProps
  initialValues,
  onConfirm,

  // #withSettings
  nextNumber,
  numberPrefix,
  autoIncrement,

  // #withDialogActions
  closeDialog,
}: NumberDialogContentProps) {
  const { mutateAsync: saveSettings } = useSaveSettings();
  const [referenceFormValues, setReferenceFormValues] =
    React.useState<ReferenceNumberFormValues | null>(null);

  // Handle the submit form.
  const handleSubmitForm: ReferenceNumberSubmitHandler = (
    values,
    { setSubmitting },
  ) => {
    // Handle the form success.
    const handleSuccess = () => {
      setSubmitting(false);
      closeDialog('transaction-number-form');
      onConfirm(values);
    };
    // Handle the form errors.
    const handleErrors = () => {
      setSubmitting(false);
    };
    if (values.incrementMode === 'manual-transaction') {
      handleSuccess();
      return;
    }
    // Transformes the form values to settings to save it.
    const options = transformFormToSettings(values, 'cashflow');

    // Save the settings.
    saveSettings({ options }).then(handleSuccess).catch(handleErrors);
  };

  // Description.
  const description =
    referenceFormValues?.incrementMode === 'auto'
      ? intl.get('cash_flow.auto_increment.auto')
      : intl.get('cash_flow.auto_increment.manually');

  // Handle the dialog close.
  const handleClose = () => {
    closeDialog('transaction-number-form');
  };

  // Handle form change.
  const handleChange = (values: ReferenceNumberFormValues) => {
    setReferenceFormValues(values);
  };

  return (
    <TransactionNumberDialogProvider>
      <ReferenceNumberForm
        initialValues={{
          ...transformSettingsToForm({
            nextNumber,
            numberPrefix,
            autoIncrement,
          }),
          ...initialValues,
        }}
        description={description}
        onSubmit={handleSubmitForm}
        onClose={handleClose}
        onChange={handleChange}
      />
    </TransactionNumberDialogProvider>
  );
}

/**
 * Что окно передаёт содержимому. Вид объявлен у собранного экрана, а не
 * выведен: `React.lazy` из «что угодно» делает экран, не принимающий свойств
 * вовсе (приём карты v84).
 */
export interface TransactionNumberDialogContentProps {
  initialValues?: Record<string, unknown>;
  onConfirm?: (values: Record<string, unknown>) => void;
}

const TransactionNumberDialogContentComposed: React.ComponentType<TransactionNumberDialogContentProps> =
  compose(
    withDialogActions,
    withSettingsActions,
    withSettings(
      ({ cashflowSetting }: { cashflowSetting?: NumberSettingsGroup }) => ({
        nextNumber: cashflowSetting?.nextNumber,
        numberPrefix: cashflowSetting?.numberPrefix,
        autoIncrement: cashflowSetting?.autoIncrement,
      }),
    ),
  )(TransactionNumberDialogContent);

export default TransactionNumberDialogContentComposed;
