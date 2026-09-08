import React from 'react';
import classNames from 'classnames';
import { Spinner } from '@blueprintjs/core';
import { CLASSES } from '@/constants/classes';
import { If } from '../Utils/If';

interface CloudLoadingIndicatorProps {
  /** Идёт ли фоновая загрузка — значок висит поверх содержимого. */
  isLoading?: boolean;
  children?: React.ReactNode;
}

export function CloudLoadingIndicator({
  isLoading,
  children,
}: CloudLoadingIndicatorProps) {
  return (
    <div
      className={classNames(CLASSES.CLOUD_SPINNER, {
        [CLASSES.IS_LOADING]: isLoading,
      })}
    >
      <If condition={isLoading}>
        <Spinner size={30} value={undefined} />
      </If>
      {children}
    </div>
  );
}
