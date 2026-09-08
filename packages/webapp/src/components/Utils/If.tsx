import React, { ReactNode } from 'react';

interface IfProps {
  /** Рисовать или нет. Отсутствие считается «нет» — так работает и код ниже. */
  condition?: boolean;
  children?: ReactNode;
  render?: () => ReactNode;
}

export const If = (props: IfProps): React.ReactElement | null =>
  props.condition ? (props.render ? <>{props.render()}</> : <>{props.children}</>) : null;
