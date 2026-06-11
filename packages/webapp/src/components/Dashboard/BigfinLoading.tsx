// @ts-nocheck
import React from 'react';
import classNames from 'classnames';
import { Icon } from '@/components';

import '@/style/components/BigfinLoading.scss';
import { useIsDarkMode } from '@/hooks/useDarkMode';

/**
 * Bigfin logo loading.
 */
export default function BigfinLoading({ className }) {
  const isDarkmode = useIsDarkMode();

  return (
    <div className={classNames('bigfin-loading', className)}>
      <div className="center">
        {isDarkmode ? (
          <Icon
            icon="bigfin-alt"
            height={37}
            width={84}
            color="#fff"
            className="bigfin-logo"
          />
        ) : (
          <Icon icon="bigfin" height={37} width={84} />
        )}
      </div>
    </div>
  );
}
