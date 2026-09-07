import React from 'react';
import intl from 'react-intl-universal';
import { Formik } from 'formik';
import { Intent } from '@blueprintjs/core';

import '@/style/pages/ReconcileCreditNote/ReconcileCreditNoteForm.scss';
import { AppToaster } from '@/components';
import { CreateReconcileCreditNoteFormSchema } from './ReconcileCreditNoteForm.schema';
import { useReconcileCreditNoteContext } from './ReconcileCreditNoteFormProvider';
import ReconcileCreditNoteFormContent from './ReconcileCreditNoteFormContent';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { compose, transformToForm } from '@/utils';
import { transformErrors } from './utils';

// Default form initial values.
const defaultInitialValues = {
  entries: [
    {
      invoice_id: '',
      amount: '',
    },
  ],
};

/**
 * Reconcile credit note form.
 */
function ReconcileCreditNoteForm({
  // #withDialogActions
  closeDialog,
}: any) {
  const {
    dialogName,
    creditNoteId,
    reconcileCreditNotes,
    createReconcileCreditNoteMutate,
  } = useReconcileCreditNoteContext();

  // Initial form values.
  const initialValues = {
    entries: reconcileCreditNotes.map((entry: any) => ({
      ...entry,
      invoice_id: entry.id,
      amount: '',
    })),
  };

  // Handle form submit.
  const handleFormSubmit = (values: any, { setSubmitting, setErrors }: any) => {
    setSubmitting(true);

    // Filters the entries.
    const entries = values.entries
      .filter((entry: any) => entry.invoice_id && entry.amount)
      .map((entry: any) => transformToForm(entry, defaultInitialValues.entries[0]));

    const form = {
      ...values,
      entries: entries,
    };
    // Handle the request success.
    const onSuccess = (response: any) => {
      AppToaster.show({
        message: intl.get('reconcile_credit_note.success_message'),
        intent: Intent.SUCCESS,
      });
      setSubmitting(false);
      closeDialog(dialogName);
    };
    // Handle the request error.
    const onError = ({
      response: {
        data: { errors },
      },
    }: any) => {
      if (errors) {
        transformErrors(errors, { setErrors });
      }
      setSubmitting(false);
    };

    createReconcileCreditNoteMutate([creditNoteId, form])
      .then(onSuccess)
      .catch(onError);
  };

  return (
    <Formik
      validationSchema={CreateReconcileCreditNoteFormSchema}
      initialValues={initialValues}
      onSubmit={handleFormSubmit}
      component={ReconcileCreditNoteFormContent}
    />
  );
}

export default compose(withDialogActions)(ReconcileCreditNoteForm);
