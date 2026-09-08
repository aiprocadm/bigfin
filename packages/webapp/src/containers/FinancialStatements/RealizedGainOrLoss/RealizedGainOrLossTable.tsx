import React from 'react';
import intl from 'react-intl-universal';

import { FinancialSheet } from '@/components';
import { WithCompanyNameProps } from '@/components/FinancialSheet/FinancialSheet';

/**
 * Realized Gain or Loss table.
 */
export default function RealizedGainOrLossTable({
  // #ownProps
  companyName,
}: WithCompanyNameProps) {
  return (
    <FinancialSheet
      companyName={companyName}
      sheetType={intl.get('realized_gain_or_loss.label')}
    ></FinancialSheet>
  );
}
