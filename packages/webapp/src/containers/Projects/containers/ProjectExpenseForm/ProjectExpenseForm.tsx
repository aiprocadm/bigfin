import React from 'react';
import moment from 'moment';
import { Formik, FormikHelpers } from 'formik';
import { CreateProjectExpenseFormSchema } from './ProjectExpenseForm.schema';
import ProjectExpenseFormContent from './ProjectExpenseFormContent';
import {
  withDialogActions,
  WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';

import { compose } from '@/utils';

const defaultInitialValues = {
  expenseName: '',
  estimatedExpense: '',
  expemseDate: moment(new Date()).format('YYYY-MM-DD'),
  expenseUnitPrice: '',
  expenseQuantity: 1,
  expenseCharge: '% markup',
  percentage: '',
  expenseTotal: '',
};

type ProjectExpenseFormValues = typeof defaultInitialValues;

/**
 * Project expense form.
 *
 * ФОРМА НИЧЕГО НЕ СОХРАНЯЕТ — как и две соседние формы раздела: запроса нет,
 * а уведомление об успехе было пустым. Серверных ручек `projects/*` не
 * существует, раздел закрыт (Р3 карты v16), окно недостижимо (Д5 карты v88).
 */
function ProjectExpenseForm({}: WithDialogActionsProps) {
  const initialValues = {
    ...defaultInitialValues,
  };

  // Handles the form submit.
  const handleFormSubmit = (
    values: ProjectExpenseFormValues,
    { setSubmitting }: FormikHelpers<ProjectExpenseFormValues>,
  ) => {
    // Сохранять некуда — снимаем «отправку», чтобы кнопка не крутилась вечно.
    setSubmitting(false);
  };
  return (
    <Formik
      validationSchema={CreateProjectExpenseFormSchema}
      initialValues={initialValues}
      onSubmit={handleFormSubmit}
      component={ProjectExpenseFormContent}
    />
  );
}

export default compose(withDialogActions)(ProjectExpenseForm);
