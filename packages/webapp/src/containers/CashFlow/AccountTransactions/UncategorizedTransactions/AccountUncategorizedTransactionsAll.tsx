import * as R from 'ramda';
import { useEffect } from 'react';
// D-redesign слайс 4d: рендер на новом примитиве data-table.tsx.
// Откат — вернуть default-импорт и тег легаси `AccountTransactionsUncategorizedTable` из './AccountTransactionsUncategorizedTable'.
import { UncategorizedTransactionsDataTableV2 } from './v2/UncategorizedTransactionsDataTableV2';
import { AccountUncategorizedTransactionsBoot } from '../AllTransactionsUncategorizedBoot';
import { AccountTransactionsCard } from './AccountTransactionsCard';
import {
  WithBankingActionsProps,
  withBankingActions,
} from '../../withBankingActions';

interface AccountUncategorizedTransactionsAllRootProps
  extends WithBankingActionsProps {}

function AccountUncategorizedTransactionsAllRoot({
  resetUncategorizedTransactionsSelected,
}: AccountUncategorizedTransactionsAllRootProps) {
  useEffect(
    () => () => {
      resetUncategorizedTransactionsSelected();
    },
    [resetUncategorizedTransactionsSelected],
  );

  return (
    <AccountUncategorizedTransactionsBoot>
      <AccountTransactionsCard>
        <UncategorizedTransactionsDataTableV2 />
      </AccountTransactionsCard>
    </AccountUncategorizedTransactionsBoot>
  );
}

export const AccountUncategorizedTransactionsAll = R.compose(
  withBankingActions,
)(AccountUncategorizedTransactionsAllRoot);
