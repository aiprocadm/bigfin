import { useMemo } from 'react';
import * as R from 'ramda';
import intl from 'react-intl-universal';
import { useAppQueryString } from '@/hooks';
import { Group, Stack, } from '@/components';
import { useAccountTransactionsContext } from './AccountTransactionsProvider';
import { TagsControl } from '@/components/TagsControl';
import { AccountUncategorizedDateFilter } from './UncategorizedTransactions/AccountUncategorizedDateFilter';
import { Divider } from '@blueprintjs/core';

export function AccountTransactionsUncategorizeFilter() {
  const { bankAccountMetaSummary } = useAccountTransactionsContext();
  const [locationQuery, setLocationQuery] = useAppQueryString();

  const totalUncategorized =
    bankAccountMetaSummary?.totalUncategorizedTransactions;
  const totalRecognized = bankAccountMetaSummary?.totalRecognizedTransactions;

  const totalPending = bankAccountMetaSummary?.totalPendingTransactions;

  const handleTabsChange = (value: string) => {
    setLocationQuery({ uncategorizedFilter: value });
  };

  const options = useMemo(
    () =>
      R.when(
        () => totalPending > 0,
        R.append({
          value: 'pending',
          label: (
            <>
              {intl.get('cashflow.uncategorized.filter.pending')}{' '}
              <strong>({totalPending})</strong>
            </>
          ),
        }),
      )([
        {
          value: 'all',
          label: (
            <>
              {intl.get('cashflow.uncategorized.filter.all')}{' '}
              <strong>({totalUncategorized})</strong>
            </>
          ),
        },
        {
          value: 'recognized',
          label: (
            <>
              {intl.get('cashflow.uncategorized.filter.recognized')}{' '}
              <strong>({totalRecognized})</strong>
            </>
          ),
        },
      ]),
    [totalPending, totalRecognized, totalUncategorized],
  );

  return (
    <Group position={'apart'} style={{ marginBottom: 14 }}>
      <Group align={'stretch'} spacing={10}>
        <TagsControl
          options={options}
          value={locationQuery?.uncategorizedFilter || 'all'}
          onValueChange={handleTabsChange}
        />
        <Divider />
        <AccountUncategorizedDateFilter />
      </Group>

      <TagsControl
        options={[
          {
            value: 'excluded',
            label: intl.get('cashflow.uncategorized.filter.excluded'),
          },
        ]}
        value={locationQuery?.uncategorizedFilter || 'all'}
        onValueChange={handleTabsChange}
      />
    </Group>
  );
}
