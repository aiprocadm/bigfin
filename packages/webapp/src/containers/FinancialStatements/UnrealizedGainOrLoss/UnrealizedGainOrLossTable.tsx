// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';

import { FinancialSheet, DataTable } from '@/components';

/**
 * Unrealized Gain or Loss table.
 */
export default function UnrealizedGainOrLossTable({
  // #ownProps
  companyName,
}) {
  return (
    <FinancialSheet
      companyName={companyName}
      sheetType={intl.get('unrealized_gain_or_loss.label')}
    ></FinancialSheet>
  );
}
