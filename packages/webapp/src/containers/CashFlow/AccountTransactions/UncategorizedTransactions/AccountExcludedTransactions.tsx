// @ts-nocheck
import { useEffect } from 'react';
import * as R from 'ramda';
import {
  WithBankingActionsProps,
  withBankingActions,
} from '../../withBankingActions';
// D-redesign слайс 4b: рендер на новом примитиве data-table.tsx.
// Откат — вернуть импорт и тег легаси `ExcludedTransactionsTable` из '../ExcludedTransactions/ExcludedTransactionsTable'.
import { ExcludedTransactionsDataTableV2 } from '../ExcludedTransactions/v2/ExcludedTransactionsDataTableV2';
import { ExcludedBankTransactionsTableBoot } from '../ExcludedTransactions/ExcludedTransactionsTableBoot';
import { AccountTransactionsCard } from './AccountTransactionsCard';

interface AccountExcludedTransactionsProps extends WithBankingActionsProps {}

function AccountExcludedTransactionsRoot({
  // #withBankingActions
  resetExcludedTransactionsSelected,
}: AccountExcludedTransactionsProps) {
  useEffect(
    () => () => {
      resetExcludedTransactionsSelected();
    },
    [resetExcludedTransactionsSelected],
  );

  return (
    <ExcludedBankTransactionsTableBoot>
      <AccountTransactionsCard>
        <ExcludedTransactionsDataTableV2 />
      </AccountTransactionsCard>
    </ExcludedBankTransactionsTableBoot>
  );
}

export const AccountExcludedTransactions = R.compose(withBankingActions)(
  AccountExcludedTransactionsRoot,
);
