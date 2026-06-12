// @ts-nocheck
import intl from 'react-intl-universal';
import { useMemo } from 'react';
import styled from 'styled-components';
import { ContentTabs } from '@/components/ContentTabs/ContentTabs';
import { useAccountTransactionsContext } from './AccountTransactionsProvider';

const AccountContentTabs = styled(ContentTabs)`
  margin: 15px 15px 0 15px;
`;

export function AccountTransactionsFilterTabs() {
  const { filterTab, setFilterTab, bankAccountMetaSummary, currentAccount } =
    useAccountTransactionsContext();

  const handleChange = (value) => {
    setFilterTab(value);
  };

  // Detarmines whether show the uncategorized transactions tab.
  const hasUncategorizedTransx = useMemo(
    () =>
      bankAccountMetaSummary?.totalUncategorizedTransactions > 0 ||
      bankAccountMetaSummary?.totalExcludedTransactions > 0 ||
      bankAccountMetaSummary?.totalPendingTransactions > 0,
    [bankAccountMetaSummary],
  );

  return (
    <AccountContentTabs value={filterTab} onChange={handleChange}>
      <ContentTabs.Tab
        id={'dashboard'}
        title={intl.get('cashflow.tabs.dashboard')}
        description={intl.get('cashflow.tabs.account_summary')}
      />
      {hasUncategorizedTransx && (
        <ContentTabs.Tab
          id={'uncategorized'}
          title={
            <>
              <span style={{ color: 'var(--color-danger)' }}>
                {currentAccount.uncategorized_transactions}
              </span>{' '}
              Uncategorized Transactions
            </>
          }
          description={intl.get('cashflow.tabs.for_bank_statement')}
        />
      )}
      <ContentTabs.Tab
        id="all"
        title={intl.get('all_transactions')}
        description={intl.get('cashflow.tabs.in_bigfin')}
      />
    </AccountContentTabs>
  );
}
