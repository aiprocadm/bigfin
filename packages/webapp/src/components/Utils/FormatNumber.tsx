import React from 'react';
import { formattedAmount } from '@/utils';

export function FormatNumber({ value, currency = '', noZero }: any) {
  // Обёртка обязательна: компонент должен вернуть элемент, а `formattedAmount`
  // даёт строку (Д1 карты v74).
  return <>{formattedAmount(value, currency, { noZero })}</>;
}

export function FormatNumberCell({ value, column: { formatNumber } }: any) {
  return <FormatNumber value={value} {...formatNumber} />;
}
