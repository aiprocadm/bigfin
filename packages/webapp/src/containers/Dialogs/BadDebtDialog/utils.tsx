import React from 'react';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';

/**
 * Transformes the response errors types.
 */
export const transformErrors = (errors: any, { setErrors }: any) => {
  if (errors.some(({ type }: any) => type === 'SALE_INVOICE_ALREADY_WRITTEN_OFF')) {
    AppToaster.show({
      message: 'SALE_INVOICE_ALREADY_WRITTEN_OFF',
      // message: intl.get(''),
      intent: Intent.DANGER,
    });
  }
};
