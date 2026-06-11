import * as moment from 'moment';
import { merge } from 'lodash';
import { IProfitLossSheetQuery } from './ProfitLossSheet.types';

/**
 * Default sheet filter query.
 * The cash basis is the default once the `accrual_pnl` feature is enabled
 * (target audience thinks in money movement); otherwise keeps the legacy
 * accrual default, where the basis is ignored by the engine anyway.
 * @param {boolean} accrualPnlEnabled - Whether the `accrual_pnl` feature is on.
 * @return {IBalanceSheetQuery}
 */
export const getDefaultPLQuery = (
  accrualPnlEnabled: boolean = false,
): IProfitLossSheetQuery => ({
  fromDate: moment().startOf('year').format('YYYY-MM-DD'),
  toDate: moment().format('YYYY-MM-DD'),

  numberFormat: {
    divideOn1000: false,
    negativeFormat: 'mines',
    showZero: false,
    formatMoney: 'total',
    precision: 2,
  },
  basis: accrualPnlEnabled ? 'cash' : 'accrual',

  noneZero: false,
  noneTransactions: false,

  displayColumnsType: 'total',
  displayColumnsBy: 'month',

  accountsIds: [],

  percentageColumn: false,
  percentageRow: false,

  percentageIncome: false,
  percentageExpense: false,

  previousPeriod: false,
  previousPeriodAmountChange: false,
  previousPeriodPercentageChange: false,

  previousYear: false,
  previousYearAmountChange: false,
  previousYearPercentageChange: false,
});

/**
 *
 * @param query
 * @returns
 */
export const mergeQueryWithDefaults = (
  query: IProfitLossSheetQuery,
  accrualPnlEnabled: boolean = false,
): IProfitLossSheetQuery => {
  return merge(getDefaultPLQuery(accrualPnlEnabled), query);
};
