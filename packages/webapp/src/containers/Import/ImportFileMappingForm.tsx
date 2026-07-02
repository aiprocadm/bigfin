import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { Form, Formik, FormikHelpers } from 'formik';

import { AppToaster } from '@/components';
import { useImportFileMapping } from '@/hooks/query/import';
import { useImportFileContext } from './ImportFileProvider';
import {
  ImportFileMappingFormProps,
  ImportFileMappingFormValues,
  ImportStepperStep,
} from './_types';
import {
  transformValueToReq,
  useImportFileMappingInitialValues,
} from './_utils';

/** Ошибка API сопоставления — интересуют только коды ошибок. */
interface ImportMappingApiError {
  response: { data: { errors: { type: string }[] } };
}

/** Formik-обёртка шага сопоставления: сабмит маппинга и переход к превью. */
export function ImportFileMappingForm({
  children,
}: ImportFileMappingFormProps) {
  // Легаси-хук без типов (TVariables=void) — уточняем сигнатуру локально.
  const { mutateAsync: submitImportFileMappingMutate } =
    useImportFileMapping({});
  const submitImportFileMapping =
    submitImportFileMappingMutate as unknown as (
      vars: [string, unknown],
    ) => Promise<unknown>;
  const { importId, setStep } = useImportFileContext();

  const initialValues = useImportFileMappingInitialValues();

  const handleSubmit = (
    values: ImportFileMappingFormValues,
    { setSubmitting }: FormikHelpers<ImportFileMappingFormValues>,
  ) => {
    setSubmitting(true);
    const _values = transformValueToReq(values);

    submitImportFileMapping([importId, _values])
      .then(() => {
        setSubmitting(false);
        setStep(ImportStepperStep.Preview);
      })
      .catch((error: ImportMappingApiError) => {
        const { data } = error.response;

        if (data.errors.find((e) => e.type === 'DUPLICATED_FROM_MAP_ATTR')) {
          AppToaster.show({
            message: intl.get('import.mapping.error.duplicated_columns'),
            intent: Intent.DANGER,
          });
        }
        if (data.errors.find((e) => e.type === 'REQUIRED_FIELDS_NOT_MAPPED')) {
          AppToaster.show({
            message: intl.get(
              'import.mapping.error.required_fields_not_mapped',
            ),
            intent: Intent.DANGER,
          });
        }
        setSubmitting(false);
      });
  };

  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      <Form>{children}</Form>
    </Formik>
  );
}
