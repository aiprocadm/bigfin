import React from 'react';
import { Formik, Form, FormikHelpers } from 'formik';

/**
 * Второй вид (`Y`) в этом объявлении не использовался нигде: его требовали от
 * каждого места, где вид называют, а сам он ни на что не влиял. Убран
 * (Д24 карты v82).
 */
export interface ElementCustomizeFormProps<T> {
  initialValues?: T;
  validationSchema?: any;
  onSubmit?: (values: T, formikHelpers: FormikHelpers<T>) => void;
  children?: React.ReactNode;
}

export function ElementCustomizeForm<T>({
  initialValues,
  validationSchema,
  onSubmit,
  children,
}: ElementCustomizeFormProps<T>) {
  // Вид значений здесь не сужается: Formik требует «объект со строковыми
  // ключами», а обёртка нарочно принимает любой набор от вызывающего.
  return (
    <Formik<any>
      initialValues={{ ...initialValues }}
      validationSchema={validationSchema}
      onSubmit={(value, helpers) => onSubmit && onSubmit(value, helpers)}
    >
      <Form>{children}</Form>
    </Formik>
  );
}
