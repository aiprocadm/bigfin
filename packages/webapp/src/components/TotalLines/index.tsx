// @ts-nocheck
import React from 'react';
import styled from 'styled-components';
import { x } from '@xstyled/emotion';
export const TotalLineBorderStyle = {
  None: 'None',
  SingleDark: 'SingleDark',
  DoubleDark: 'DoubleDark',
};

export const TotalLineTextStyle = {
  Regular: 'Regular',
  Bold: 'Bold',
};

/**
 * Свойства блока итогов. Все, кроме содержимого, необязательные.
 *
 * Карта v59 объявила свойства строки итога (`TotalLineProps`), но сам блок
 * пропустила — та же ошибка этажом выше. Проверка выводила из разбора все
 * четыре свойства как обязательные, и одиннадцать подвалов, передающих только
 * содержимое, считались ошибкой (Д2 карты v75).
 */
export interface TotalLinesProps {
  children?: React.ReactNode;
  /** Ширина колонки с суммой. По умолчанию — из вёрстки. */
  amountColWidth?: string | number;
  /** Ширина колонки с подписью. По умолчанию — из вёрстки. */
  labelColWidth?: string | number;
  className?: string;
}

export function TotalLines({
  children,
  amountColWidth,
  labelColWidth,
  className,
}: TotalLinesProps) {
  return (
    <TotalLinesRoot
      className={className}
      amountColWidth={amountColWidth}
      labelColWidth={labelColWidth}
    >
      {children}
    </TotalLinesRoot>
  );
}

/**
 * Свойства строки итога. Все необязательные (Д1 карты v59): раньше типа не
 * было, и проверка требовала передавать сразу все пять.
 */
export interface TotalLineProps {
  title?: React.ReactNode;
  value?: React.ReactNode;
  borderStyle?: string;
  textStyle?: string;
  className?: string;
}

export function TotalLine({
  title,
  value,
  borderStyle,
  textStyle,
  className,
}: TotalLineProps) {
  return (
    <TotalLinePrimitive
      borderStyle={borderStyle}
      textStyle={textStyle}
      className={className}
    >
      <div className="title">{title}</div>
      <div className="amount">{value}</div>
    </TotalLinePrimitive>
  );
}

export const TotalLinesRoot = styled.div`
  display: table;

  ${(props) =>
    props.amountColWidth &&
    `
    .amount{
      width: ${props.amountColWidth}
    }
  `}

  ${(props) =>
    props.labelColWidth &&
    `
    .title{
      width: ${props.labelColWidth}
    }
  `}
`;

const TotalLinePrimitiveRoot = styled.div`
  --x-color-divider: #d2dde2;
  --x-color-divider-dark: #000;

  --x-color-divider: rgba(255, 255, 255, 0.1);
  --x-color-divider-dark: rgba(255, 255, 255, 0.2);

  display: table-row;

  .amount,
  .title {
    display: table-cell;
    padding: 8px;
    border-bottom: 1px solid var(--x-color-divider);

    ${(props) =>
    props.borderStyle === TotalLineBorderStyle.DoubleDark &&
    `
      border-bottom: 3px double var(--x-color-divider-dark);
    `}
    ${(props) =>
    props.borderStyle === TotalLineBorderStyle.SingleDark &&
    `
      border-bottom: 1px double var(--x-color-divider-dark);
    `}
    ${(props) =>
    props.borderStyle === TotalLineBorderStyle.None &&
    `
      border-bottom-color: transparent;
    `}
    ${(props) =>
    props.textStyle === TotalLineTextStyle.Bold &&
    `
      font-weight: 600;
    `}
  }

  .amount {
    text-align: right;
    width: 25%;
  }
`;

const TotalLineAmount = (props) => {
  return <x.div display={'table-cell'} padding={'8px'} textAlign={'right'} {...props} />;
};

export const TotalLineTitle = (props) => {
  return <x.div display={'table-cell'} padding={'8px'} {...props} />;
};

/**
 * Строка итога с приложенными частями: `TotalLinePrimitive.Title`, `.Amount`.
 *
 * `styled.div` о таких частях не знает, поэтому их надо назвать отдельно —
 * иначе места вызова считают `TotalLinePrimitive.Title` не компонентом вовсе
 * (Д2 карты v84). Приём тот же, что у `AppContentShell` в карте v82.
 */
export const TotalLinePrimitive = TotalLinePrimitiveRoot as typeof TotalLinePrimitiveRoot & {
  Amount: typeof TotalLineAmount;
  Title: typeof TotalLineTitle;
};

TotalLinePrimitive.Amount = TotalLineAmount;
TotalLinePrimitive.Title = TotalLineTitle;
