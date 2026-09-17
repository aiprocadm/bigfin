import React from 'react';
import { Formik, FormikHelpers } from 'formik';
import { CreateEstimatedExpenseFormSchema } from './EstimatedExpense.schema';
import EstimatedExpenseFormConent from './EstimatedExpenseFormConent';
import {
  withDialogActions,
  WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';
import { compose } from '@/utils';

const defaultInitialValues = {
  estimatedExpense: '',
  unitPrice: '',
  quantity: 1,
  charge: '% markup',
  percentage: '',
};

type EstimatedExpenseFormValues = typeof defaultInitialValues;

/**
 * Estimated expense form dialog.
 *
 * ФОРМА НИЧЕГО НЕ СОХРАНЯЕТ. Отправка объявляла два обработчика ответа и на
 * этом заканчивалась: запроса не было, а `AppToaster.show({})` показал бы
 * пустое уведомление. Дописать сохранение некуда — серверных ручек
 * `projects/*` не существует ни одной, и раздел «Проекты» закрыт целиком
 * (Р3 карты v16). Окно недостижимо: маршрута `/projects` нет, ссылок на него
 * тоже. Оставлено видимой заглушкой, пока владелец не решит судьбу файлов
 * раздела (Д5 карты v88).
 */
function EstimatedExpenseForm({}: WithDialogActionsProps) {
  const initialValues = {
    ...defaultInitialValues,
  };

  // Handles the form submit.
  const handleFormSubmit = (
    values: EstimatedExpenseFormValues,
    { setSubmitting }: FormikHelpers<EstimatedExpenseFormValues>,
  ) => {
    // Сохранять некуда — снимаем «отправку», чтобы кнопка не крутилась вечно.
    setSubmitting(false);
  };

  return (
    <Formik
      validationSchema={CreateEstimatedExpenseFormSchema}
      initialValues={initialValues}
      onSubmit={handleFormSubmit}
      component={EstimatedExpenseFormConent}
    />
  );
}

export default compose(withDialogActions)(EstimatedExpenseForm);
