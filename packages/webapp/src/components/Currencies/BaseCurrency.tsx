import React from 'react';
import { CurrencyTag } from '@/components';

/**
 * base currecncy.
 * @returns
 */
export function BaseCurrency({ currency }: any) {
  return <CurrencyTag>{currency}</CurrencyTag>;
}
