// @ts-nocheck
import React from 'react';
import { Intent } from '@blueprintjs/core';
import { Field, FastField, getIn } from 'formik';
import { MoneyInputGroup } from './MoneyInputGroup';

const fieldToMoneyInputGroup = ({
  field: { onBlur: onFieldBlur, ...field },
  form: { setFieldValue, touched, errors },
  onBlur,
  ...props
}) => {
  const fieldError = getIn(errors, field.name);
  const showError = getIn(touched, field.name) && !!fieldError;

  return {
    intent: showError ? Intent.DANGER : Intent.NONE,
    onBlurValue:
      onBlur ??
      function (e) {
        onFieldBlur(e ?? field.name);
      },
    ...field,
    onChange: (value) => {
      setFieldValue(field.name, value);
    },
    ...props,
  };
};

function FieldToMoneyInputGroup({ ...props }) {
  return <MoneyInputGroup {...fieldToMoneyInputGroup(props)} />;
}

interface FMoneyInputGroupProps {
  /**
   * Быстрое поле: не перерисовывать, пока не изменилось его собственное
   * значение. Компонент признак читает — им он и выбирает между `FastField` и
   * `Field`. Но без объявления свойств проверка считала его **обязательным**,
   * и каждое `<FMoneyInputGroup name={…} />` без него было ошибкой
   * (Д1 карты v71).
   */
  fastField?: boolean;
  /** Остальное уходит в поле формы как есть. */
  [key: string]: any;
}

export function FMoneyInputGroup({
  fastField,
  ...props
}: FMoneyInputGroupProps) {
  const FieldComponent = fastField ? FastField : Field;
  return <FieldComponent {...props} component={FieldToMoneyInputGroup} />;
}
