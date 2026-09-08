import React from 'react';
import { FInputGroup } from '@/components';
import { useFormikContext } from 'formik';

interface FInputGroupComponentProps {
  /** Куда записать произведение. Обязательно: без него запись уходила в никуда. */
  toField: string;
  /**
   * Какие два поля перемножать. По умолчанию — поля формы расхода проекта;
   * в окне плановых расходов поля называются иначе, и там пара передаётся
   * явно (Д2 карты v71).
   */
  fromFields?: [string, string];
  /**
   * Имя поля формы. Обязательно: без него поле ввода не к чему привязать, и
   * проверка видела здесь только `onBlur` (Д38 карты v75).
   */
  name: string;
  /** Остальное уходит в поле ввода как есть. */
  [key: string]: any;
}

export function FInputGroupComponent({
  toField,
  fromFields = ['expenseQuantity', 'expenseUnitPrice'],
  ...props
}: FInputGroupComponentProps) {
  const { values, setFieldValue } = useFormikContext<any>();
  const total = Number(values[fromFields[0]]) * Number(values[fromFields[1]]);

  const handleBlur = () => {
    setFieldValue(toField, Number.isFinite(total) ? total : 0);
  };

  const inputGroupProps = {
    onBlur: handleBlur,
    ...props,
  };
  return <FInputGroup {...inputGroupProps} />;
}
