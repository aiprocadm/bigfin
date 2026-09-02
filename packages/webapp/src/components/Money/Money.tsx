import React from 'react';
import { formattedAmount } from '@/utils';

export function Money({ amount, currency }: any) {
  return (
    <span>{ formattedAmount(amount, currency) }</span>
  );
}