import { useAccount, useAccountTransactions } from '@/hooks/query';

import { AccountDetailsCardsV2 } from './AccountDetailsCardsV2';
import { AccountDetailsHeaderV2 } from './AccountDetailsHeaderV2';
import { AccountDetailsSkeletonV2 } from './AccountDetailsSkeletonV2';
import type { AccountDetail, AccountTransaction } from './types';

interface AccountDetailsContentV2Props {
  accountId?: number | string;
}

// useAccount / useAccountTransactions — легаси react-query хуки без типов,
// кастуем результат локально.
interface UseAccountResult {
  data: AccountDetail | undefined;
  isLoading: boolean;
}
interface UseAccountTransactionsResult {
  data: AccountTransaction[] | undefined;
  isLoading: boolean;
}

/**
 * Содержимое drawer'а «Детали счёта»: загрузка данных, скелетон,
 * компоновка «шапка (закреплена) + прокручиваемые карточки».
 */
export function AccountDetailsContentV2({
  accountId,
}: AccountDetailsContentV2Props) {
  const { data: account, isLoading: isAccountLoading } = useAccount(accountId, {
    enabled: !!accountId,
  }) as UseAccountResult;

  const { data: transactions, isLoading: isTransactionsLoading } =
    useAccountTransactions(accountId, {
      enabled: !!accountId,
    }) as UseAccountTransactionsResult;

  if (isAccountLoading || isTransactionsLoading || !account?.id) {
    return <AccountDetailsSkeletonV2 />;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AccountDetailsHeaderV2 account={account} accountId={account.id} />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <AccountDetailsCardsV2
          account={account}
          transactions={transactions ?? []}
        />
      </div>
    </div>
  );
}
