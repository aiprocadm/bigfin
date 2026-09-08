import React from 'react';
import { Alert } from '@/components';
import { Intent } from '@blueprintjs/core';
import { useFormikContext } from 'formik';

export function TaxRateFormDialogFormErrors() {
  const { errors } = useFormikContext<any>();

  if (!errors.confirm_edit) return null;

  // Formik отдаёт замечание строкой или списком строк — плашка рисует и то,
  // и другое, поэтому приводим к узлу разметки (Д43 карты v75).
  return (
    <Alert intent={Intent.DANGER}>
      {errors.confirm_edit as React.ReactNode}
    </Alert>
  );
}
