import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';

/** Типизированная ошибка API удаления поступления. */
interface ApiError {
  type: string;
}

export const handleDeleteErrors = (errors: ApiError[]) => {
  if (errors.find((e) => e.type === 'CANNOT_DELETE_TRANSACTION_MATCHED')) {
    AppToaster.show({
      intent: Intent.DANGER,
      message: intl.get(
        'invoices.error.cannot_delete_transaction_matched_with_bank',
      ),
    });
  }
};
