import React from 'react';
import clsx from 'classnames';
import styled from 'styled-components';

/** Свойства плашки. Все необязательные: рисуем то, что дали (Д37 карты v75). */
export interface AlertProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  intent?: string;
  className?: string;
}

export function Alert({
  title,
  description,
  children,
  intent,
  className,
}: AlertProps) {
  return (
    <AlertRoot className={clsx(className)} intent={intent}>
      {title && <AlertTitle>{title}</AlertTitle>}
      {description && <AlertDesc>{description}</AlertDesc>}
      {children && <AlertDesc>{children}</AlertDesc>}
    </AlertRoot>
  );
}

/** Обёртка читает `intent` — значит, его надо объявить (Д8 карты v76). */
const AlertRoot = styled.div<{ intent?: string }>`
  border: 1px solid rgb(223, 227, 230);
  background: var(--color-alert-default-background);
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 20px;

  ${(props) =>
    props.intent === 'danger' &&
    `
    border-color: var(--color-alert-danger-border);
    background: var(--color-alert-danger-background);

    ${AlertDesc} {
      color: var(--color-alert-danger-description-text);
    }
    ${AlertTitle} {
      color: var(--color-alert-danger-title-text);
    }
  `}

  ${(props) =>
    props.intent === 'primary' &&
    `
    background: var(--color-alert-primary-background);
    border-color: var(--color-alert-primary-border);

    ${AlertTitle} {
      color: var(--color-alert-primary-title-text);
    }
    ${AlertDesc} {
      color: var(--color-alert-primary-description-text);
    }
  `}
`;

export const AlertTitle = styled.h3`
  color: var(--color-alert-default-title-text);
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 600;
`;

export const AlertDesc = styled.p`
  color: var(--color-alert-default-description-text);
  margin: 0;
`;
