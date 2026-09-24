import React from 'react';
import intl from 'react-intl-universal';
import { useSaveSettings } from '@/hooks/query';

import { InvoiceNumberDialogProvider } from './InvoiceNumberDialogProvider';
import ReferenceNumberForm from '@/containers/JournalNumber/ReferenceNumberForm';

import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withSettings } from '@/containers/Settings/withSettings';
import { withSettingsActions } from '@/containers/Settings/withSettingsActions';
import { compose } from '@/utils';
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
import { DialogsName } from '@/constants/dialogs';

/**
 * invoice number dialog's content.
 */
function InvoiceNumberDialogContent({
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
      closeDialog(DialogsName.InvoiceNumberSettings);
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
    const options = transformFormToSettings(values, 'sales_invoices');

    // Save the settings.
    saveSettings({ options }).then(handleSuccess).catch(handleErrors);
  };
  // Handle the dialog close.
  const handleClose = () => {
    closeDialog(DialogsName.InvoiceNumberSettings);
  };
  // Handle form change.
  const handleChange = (values: ReferenceNumberFormValues) => {
    setReferenceFormValues(values);
  };
  // Description.
  const description =
    referenceFormValues?.incrementMode === 'auto'
      ? intl.get('invoice.auto_increment.auto')
      : intl.get('invoice.auto_increment.manually');

  const initialFormValues = {
    ...transformSettingsToForm({
      nextNumber,
      numberPrefix,
      autoIncrement,
    }),
    ...initialValues,
  };

  return (
    <InvoiceNumberDialogProvider>
      <ReferenceNumberForm
        initialValues={initialFormValues}
        description={description}
        onSubmit={handleSubmitForm}
        onClose={handleClose}
        onChange={handleChange}
      />
    </InvoiceNumberDialogProvider>
  );
}

/**
 * Что окно передаёт содержимому. Вид объявлен у собранного экрана, а не
 * выведен: `React.lazy` из «что угодно» делает экран, не принимающий свойств
 * вовсе (приём карты v84).
 */
export interface InvoiceNumberDialogContentProps {
  initialValues?: Record<string, unknown>;
  onConfirm?: (values: Record<string, unknown>) => void;
}

const InvoiceNumberDialogContentComposed: React.ComponentType<InvoiceNumberDialogContentProps> =
  compose(
    withDialogActions,
    withSettingsActions,
    withSettings(
      ({ invoiceSettings }: { invoiceSettings?: NumberSettingsGroup }) => ({
        nextNumber: invoiceSettings?.nextNumber,
        numberPrefix: invoiceSettings?.numberPrefix,
        autoIncrement: invoiceSettings?.autoIncrement,
      }),
    ),
  )(InvoiceNumberDialogContent);

export default InvoiceNumberDialogContentComposed;
