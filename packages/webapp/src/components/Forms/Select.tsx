import React from 'react';
import intl from 'react-intl-universal';
import { Button } from '@blueprintjs/core';
import { FormikSelect, FormikSelectProps } from '@blueprintjs-formik/select';
import styled from 'styled-components';
import clsx from 'classnames';

/**
 * Свойства обёртки над `FormikSelect`.
 *
 * Библиотека закрепляет вид элемента списка за `SelectOptionProps`, но сама
 * читает элементы через `valueAccessor` / `textAccessor` — на деле список
 * бывает любым (ставки налога, отчёты, ветки), поэтому здесь «что угодно»,
 * а не выдуманная общая форма. `items` необязателен: пока список не
 * загрузился, его нет (Р4 карты v16). `placeholder` — узел, а не строка:
 * экраны настройки передают сюда `<T/>`, и кнопка это рисует (Д5 карты v85).
 *
 * Чего здесь нет намеренно: `fastField` и `searchable`. В пакете
 * `@blueprintjs-formik/select` этих слов нет вовсе — свойства не читал никто
 * (Д18 карты v85; сторож `propsNobodyKnows.spec.ts`). `itemsEqual` и
 * `itemDisabled` не объявлены, потому что у библиотеки они завязаны на имена
 * полей её узкого вида элемента, а в витрине их не передаёт никто.
 */
export interface FSelectProps
  extends Omit<
    FormikSelectProps<any>,
    'items' | 'placeholder' | 'itemsEqual' | 'itemDisabled'
  > {
  items?: any[];
  placeholder?: React.ReactNode;
}

type SelectInputProps = Parameters<
  NonNullable<FormikSelectProps<any>['input']>
>[0];

export function FSelect(props: FSelectProps) {
  const { items, placeholder, ...rest } = props;

  const input = ({ text }: SelectInputProps) => (
    <SelectButton
      text={text || placeholder || intl.get('select.default_placeholder')}
      disabled={props.disabled || false}
      {...props.buttonProps}
      className={clsx({ 'is-selected': !!text }, props.className)}
    />
  );
  // Пока список не загрузился (или запрос упал), items бывает undefined —
  // а FormikSelect зовёт items.find и роняет всю страницу белым экраном
  // (так падала форма «Поступление оплаты», Р4 карты v16).
  //
  // `placeholder` дальше не уходит: библиотека читает его только для своей
  // кнопки, а кнопка здесь своя.
  return (
    <FormikSelect input={input} fill={true} {...rest} items={items ?? []} />
  );
}

export const SelectButton = styled(Button)`
  --x-color-select-background: #fff;
  --x-color-select-border: #ced4da;
  --x-color-select-caret: #8d8d8d;

  .bp4-dark & {
    --x-color-select-background: rgba(17, 20, 24, 0.3);
    --x-color-select-border: rgba(255, 255, 255, 0.15);
    --x-color-select-caret: rgba(255, 255, 255, 0.25);
  }
  outline: none;
  box-shadow: 0 0 0 transparent;
  border: 1px solid var(--x-color-select-border);
  position: relative;
  padding-right: 30px;

  &.bp4-small {
    padding-right: 24px;
  }
  &:not(.is-selected):not([class*='bp4-intent-']):not(.bp4-minimal) {
    color: #8f99a8;
  }
  &:after {
    content: '';
    display: inline-block;
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 5px solid var(--x-color-select-caret);

    position: absolute;
    right: 0;
    top: 50%;
    margin-top: -2px;
    margin-right: 12px;
    border-radius: 1px;
  }
  &:not([class*='bp4-intent-']):not(.bp4-disabled) {
    &,
    &:hover {
      background: var(--x-color-select-background);
    }
  }
  .bp4-intent-danger & {
    border-color: #db3737;
  }
`;
