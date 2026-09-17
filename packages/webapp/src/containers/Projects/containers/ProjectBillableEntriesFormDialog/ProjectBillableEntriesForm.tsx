import React from 'react';
import { Formik, FormikHelpers } from 'formik';
import { ProjectBillableEntriesFormSchema } from './ProjectBillableEntriesForm.schema';
import ProjectBillableEntriesFormContent from './ProjectBillableEntriesFormContent';
import {
  withDialogActions,
  WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';

import { compose } from '@/utils';

const defaultInitialValues = {};

type ProjectBillableEntriesFormValues = typeof defaultInitialValues;

/**
 * project billable entries form.
 *
 * ФОРМА НИЧЕГО НЕ СОХРАНЯЕТ — как и две соседние формы раздела: запроса нет,
 * а уведомление об успехе было пустым. Серверных ручек `projects/*` не
 * существует, раздел закрыт (Р3 карты v16), окно недостижимо (Д5 карты v88).
 */
function ProjectBillableEntriesForm({}: WithDialogActionsProps) {
  const initialValues = {
    ...defaultInitialValues,
  };

  // Handles the form submit.
  const handleFormSubmit = (
    values: ProjectBillableEntriesFormValues,
    { setSubmitting }: FormikHelpers<ProjectBillableEntriesFormValues>,
  ) => {
    // Сохранять некуда — снимаем «отправку», чтобы кнопка не крутилась вечно.
    setSubmitting(false);
  };

  return (
    <Formik
      validationSchema={ProjectBillableEntriesFormSchema}
      initialValues={initialValues}
      onSubmit={handleFormSubmit}
      component={ProjectBillableEntriesFormContent}
    />
  );
}

export default compose(withDialogActions)(ProjectBillableEntriesForm);
