import { useCallback } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { AppToaster } from '@/components';
import { transformTableStateToQuery } from '@/utils';
import type { ServiceError } from '@/utils/formTypes';

// Transform API errors in toasts messages.
export const transformErrors = (errors: ServiceError[]) => {
  if (errors.some((e) => e.type === 'VENDOR.HAS.BILLS')) {
    AppToaster.show({
      message: intl.get('vendor_has_bills'),
      intent: Intent.DANGER,
    });
  }
};


export const transformVendorsStateToQuery = (tableState: any) => {
  return {
    ...transformTableStateToQuery(tableState),
    inactive_mode: tableState.inactiveMode || false,
  };
}