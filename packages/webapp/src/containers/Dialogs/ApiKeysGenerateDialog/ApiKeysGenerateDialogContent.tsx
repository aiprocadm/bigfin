// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Formik } from 'formik';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { AppToaster } from '@/components';
import { useGenerateApiKey } from '@/hooks/query';
import ApiKeysGenerateFormContent from './ApiKeysGenerateFormContent';
import ApiKeysGenerateFormSchema from './ApiKeysGenerateForm.schema';
import ApiKeyDisplayView from './ApiKeyDisplayView';
import {
  withDialogActions,
  WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';
import { compose } from '@/utils';

const defaultInitialValues = {
  name: '',
};

/**
 * API Keys Generate form dialog content.
 */
/**
 * Что окно передаёт содержимому.
 *
 * Вид объявлен здесь, а не выведен: сборка отдаёт «что угодно», а `React.lazy`
 * из «что угодно» делает экран, **не принимающий свойств вовсе** (Д4 карты v84,
 * тот же случай, что в карте v82).
 */
export interface ApiKeysGenerateDialogContentProps {
  dialogName: string;
}

function ApiKeysGenerateDialogContent({
  // #withDialogActions
  closeDialog,
  dialogName,
}: ApiKeysGenerateDialogContentProps & WithDialogActionsProps) {
  const [generatedApiKey, setGeneratedApiKey] = useState(null);
  const generateApiKeyMutate = useGenerateApiKey();

  // Handles the form submit.
  const handleFormSubmit = (values, { setSubmitting, setErrors }) => {
    const form = { name: values.name || undefined };

    // Handle request response errors.
    const handleError = (error) => {
      const errors = error?.response?.data?.errors;
      if (errors) {
        const errorsTransformed = Object.keys(errors).reduce((acc, key) => {
          acc[key] = errors[key][0];
          return acc;
        }, {});
        setErrors(errorsTransformed);
      }
      setSubmitting(false);
    };

    generateApiKeyMutate.mutate(form, {
      onSuccess: (response) => {
        // The API returns { key, id }, which might be wrapped in response.data
        const apiKey = response?.data?.key || response?.key;
        if (apiKey) {
          setGeneratedApiKey(apiKey);
        } else {
          setSubmitting(false);
        }
      },
      onError: handleError,
    });
  };

  // If API key has been generated, show the display view
  if (generatedApiKey) {
    return (
      <ApiKeyDisplayView
        dialogName={dialogName}
        apiKey={generatedApiKey}
        onClose={() => {
          setGeneratedApiKey(null);
          closeDialog(dialogName);
        }}
      />
    );
  }

  // Otherwise, show the generate form
  return (
    <Formik
      validationSchema={ApiKeysGenerateFormSchema}
      initialValues={defaultInitialValues}
      onSubmit={handleFormSubmit}
    >
      <ApiKeysGenerateFormContent dialogName={dialogName} />
    </Formik>
  );
}

const ApiKeysGenerateDialogContentComposed: React.ComponentType<ApiKeysGenerateDialogContentProps> =
  compose(withDialogActions)(ApiKeysGenerateDialogContent);

export default ApiKeysGenerateDialogContentComposed;
