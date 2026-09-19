import React, { useCallback } from 'react';
import { Plus } from 'lucide-react';

import { compose } from '@/utils';
import { FormattedMessage as T } from '@/components';
import { Button } from '@/components/ui/button';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';

/**
 * Настройки — действия над валютами.
 *
 * Кнопка переведена на новую (остаток Д1): на телефоне у неё высота под
 * палец, а значок берётся из общего набора, а не из старой библиотеки.
 */
function CurrenciesActions({ openDialog }: any) {
  const handleClickNewCurrency = useCallback(() => {
    openDialog('currency-form');
  }, [openDialog]);

  return (
    <div className="users-actions">
      <Button onClick={handleClickNewCurrency}>
        <Plus className="h-4 w-4" aria-hidden />
        <T id={'new_currency'} />
      </Button>
    </div>
  );
}

export default compose(withDialogActions)(CurrenciesActions);
