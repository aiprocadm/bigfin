// @ts-nocheck
import React from 'react';
import classNames from 'classnames';
import { Icon } from '@/components';

import '@/style/components/BigFinLoading.scss';
import { useIsDarkMode } from '@/hooks/useDarkMode';

/**
 * BigFin logo loading.
 */
export default function BigFinLoading({ className }) {
  const isDarkmode = useIsDarkMode();

  return (
    <div className={classNames('bigfin-loading', className)}>
      <div class="center">
        {isDarkmode ? (
          <Icon
            icon="bigfin-alt"
            height={37}
            width={228}
            color="#fff"
            className="bigfin-logo"
          />
        ) : (
          <Icon icon="bigfin" height={37} width={228} />
        )}
      </div>
    </div>
  );
}
