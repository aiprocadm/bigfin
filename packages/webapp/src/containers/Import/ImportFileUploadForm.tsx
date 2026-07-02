import type { ComponentProps, ReactNode } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { Form, Formik, FormikHelpers, type FormikConfig } from 'formik';
import * as Yup from 'yup';

import { AppToaster } from '@/components';
import { useImportFileUpload } from '@/hooks/query/import';
import { transformToCamelCase } from '@/utils';
import { useImportFileContext, type EntityColumn } from './ImportFileProvider';
import { ImportAlert, ImportStepperStep } from './_types';
import { useAlertsManager } from './AlertsManager';

interface ImportFileUploadValues {
  file: File | null;
}

const initialValues: ImportFileUploadValues = {
  file: null,
};

// Сообщение нигде не показывается — валидация лишь блокирует пустой сабмит.
const validationSchema = Yup.object().shape({
  file: Yup.mixed().required(),
});

interface ImportFileUploadFormProps {
  children: ReactNode;
  formikProps?: Partial<FormikConfig<ImportFileUploadValues>>;
  formProps?: ComponentProps<typeof Form>;
}

/** Ошибка API загрузки файла — интересуют только коды ошибок. */
interface ImportUploadApiError {
  response: { data: { errors: { type: string }[] } };
}

/** Ответ загрузки файла (snake_case → transformToCamelCase). */
interface ImportUploadResponseData {
  import: { importId: string };
  sheetColumns: string[];
  resourceColumns: EntityColumn[];
}

/** Formik-обёртка шага загрузки: сабмит файла и переход к сопоставлению. */
export function ImportFileUploadForm({
  children,
  formikProps,
  formProps,
}: ImportFileUploadFormProps) {
  const { showAlert, hideAlerts } = useAlertsManager();
  // Легаси-хук без типов (TVariables=void) — уточняем сигнатуру локально.
  const { mutateAsync: uploadImportFileMutate } = useImportFileUpload({});
  const uploadImportFile = uploadImportFileMutate as unknown as (
    fd: FormData,
  ) => Promise<{ data: unknown }>;
  const {
    resource,
    params,
    setStep,
    setSheetColumns,
    setEntityColumns,
    setImportId,
  } = useImportFileContext();

  const handleSubmit = (
    values: ImportFileUploadValues,
    { setSubmitting }: FormikHelpers<ImportFileUploadValues>,
  ) => {
    hideAlerts();
    if (!values.file) return;

    setSubmitting(true);
    const formData = new FormData();
    formData.append('file', values.file);
    formData.append('resource', resource);
    formData.append('params', JSON.stringify(params));

    uploadImportFile(formData)
      .then(({ data }: { data: unknown }) => {
        const _data = transformToCamelCase(data) as ImportUploadResponseData;

        setImportId(_data.import.importId);
        setSheetColumns(_data.sheetColumns);
        setEntityColumns(_data.resourceColumns);
        setStep(ImportStepperStep.Mapping);
        setSubmitting(false);
      })
      .catch((error: ImportUploadApiError) => {
        const { data } = error.response;

        if (
          data.errors.find(
            (er) => er.type === 'IMPORTED_FILE_EXTENSION_INVALID',
          )
        ) {
          AppToaster.show({
            intent: Intent.DANGER,
            message: intl.get('import.upload.error.unsupported_extension'),
          });
        }
        if (data.errors.find((er) => er.type === 'IMPORTED_SHEET_EMPTY')) {
          showAlert(ImportAlert.IMPORTED_SHEET_EMPTY);
        }
        setSubmitting(false);
      });
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      {...formikProps}
    >
      <Form {...formProps}>{children}</Form>
    </Formik>
  );
}
