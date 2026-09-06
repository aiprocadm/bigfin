import React from 'react';
import { formattedAmount } from '@/utils';

export function FormatNumber({ value, currency = '', noZero }: any) {
  return formattedAmount(value, currency, { noZero });
}

export function FormatNumberCell({ value, column: { formatNumber } }: any) {
  return <FormatNumber value={value} {...formatNumber} />;
}
