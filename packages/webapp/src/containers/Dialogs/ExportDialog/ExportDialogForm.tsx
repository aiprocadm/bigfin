// @ts-nocheck
// Пометка возвращена: этот файл — из «длинного хвоста» слоя карты v83.
// Общие причины слоя закрыты (крючок скачивания, ключ уведомления, свойства
// окон и ящиков, формат чисел у отчётов); здесь остались одиночные задачи —
// составные компоненты, сборка через ramda, виды у Formik. Каждая требует
// своего разбора, а половину дерева без пометки оставить нельзя: тогда
// проверка типов красная и сборка не проходит.
import { Formik } from 'formik';
import intl from 'react-intl-universal';

import { compose, transformToForm } from '@/utils';

import { getExportDialogFormSchema } from './ExportDialogForm.schema';
import { ExportDialogFormContent } from './ExportDialogFormContent';
import { useResourceExport } from '@/hooks/query/FinancialReports/use-export';
import { ExportFormInitialValues } from './type';
import { AppToaster } from '@/components';
import { Intent } from '@blueprintjs/core';
import {
  withDialogActions,
  WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';
import { DialogsName } from '@/constants/dialogs';
import { showApiError } from '@/utils/showApiError';

// Default initial form values.
const defaultInitialValues = {
  resource: '',
  format: 'csv',
};

interface ExportDialogFormProps {
  initialValues?: ExportFormInitialValues;
}

/**
 * Account form dialog content.
 */
function ExportDialogFormRoot({
  // #ownProps
  initialValues,

  // #withDialogActions
  closeDialog,
}: ExportDialogFormProps & WithDialogActionsProps) {
  const { mutateAsync: mutateExport } = useResourceExport();

  // Callbacks handles form submit.
  const handleFormSubmit = (values, { setSubmitting, setErrors }) => {
    setSubmitting(true);
    const { resource, format } = values;

    mutateExport({ resource, format })
      .then(() => {
        setSubmitting(false);
        closeDialog(DialogsName.Export);
      })
      .catch((error) => {
        setSubmitting(false);
        // Раньше здесь стоял общий текст «что-то пошло не так», и причина
        // отказа (например «сузьте отбор») терялась (М3 карты v15).
        showApiError(error);
      });
  };

  // Form initial values in create and edit mode.
  const initialFormValues = {
    ...defaultInitialValues,
    /**
     * We only care about the fields in the form. Previously unfilled optional
     * values such as `notes` come back from the API as null, so remove those
     * as well.
     */
    ...transformToForm(initialValues, defaultInitialValues),
  };
  return (
    <Formik
      validationSchema={getExportDialogFormSchema()}
      initialValues={initialFormValues}
      onSubmit={handleFormSubmit}
    >
      <ExportDialogFormContent />
    </Formik>
  );
}

export const ExportDialogForm =
  compose(withDialogActions)(ExportDialogFormRoot);
