import React from 'react';
import styled from 'styled-components';

/** Цветовая подсказка подписи: чем она тревожнее, тем заметнее. */
type TextStatusIntent = 'warning' | 'danger' | 'success' | 'primary' | 'none';

interface TextStatusProps {
  intent?: TextStatusIntent;
  children?: React.ReactNode;
}

export function TextStatus({ intent, children }: TextStatusProps) {
  return <TextStatusRoot intent={intent}>{children}</TextStatusRoot>;
}

interface TextStatusRootProps {
  /**
   * Свойство ИСПОЛЬЗУЕТСЯ в оформлении ниже пять раз, но объявлено не было:
   * слепая зона типов прятала это.
   */
  intent?: TextStatusIntent;
}

const TextStatusRoot = styled.span<TextStatusRootProps>`
  ${(props) =>
    props.intent === 'warning' &&
    `
  color: #c87619;`}

  ${(props) =>
    props.intent === 'danger' &&
    `
  color: #f17377;`}

  ${(props) =>
    props.intent === 'success' &&
    `
  color: #238551;`}

  ${(props) =>
    props.intent === 'none' &&
    `
  color: #777;`}

  ${(props) =>
    props.intent === 'primary' &&
    `
  color: #1652c8;`}
`;
