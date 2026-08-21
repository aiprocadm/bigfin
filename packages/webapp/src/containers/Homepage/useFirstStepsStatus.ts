// @ts-nocheck
import { useAccounts } from '@/hooks/query';
import { useCustomers } from '@/hooks/query/customers';
import { useInvoices } from '@/hooks/query/invoices';
import { usePaymentReceives } from '@/hooks/query/paymentReceives';
import { useItems } from '@/hooks/query/items';
import { ACCOUNT_TYPE } from '@/constants/accountTypes';
import { buildFirstSteps } from './firstSteps';

/** Лёгкие запросы: по одной строке, нужен только счётчик из пагинации. */
const ONE = { page_size: 1 };

/**
 * Отметки чек-листа «первые шаги» по настоящим данным (Р4 карты v16).
 *
 * Если какой-то модуль выключен и его ручка отвечает отказом, шаг просто
 * остаётся несделанным — ссылка приведёт на страницу с честным объяснением.
 */
export const useFirstStepsStatus = () => {
  const { data: customers, isLoading: isCustomersLoading } = useCustomers(ONE);
  const { data: items, isLoading: isItemsLoading } = useItems(ONE);
  const { data: invoices, isLoading: isInvoicesLoading } = useInvoices(ONE);
  const { data: payments, isLoading: isPaymentsLoading } =
    usePaymentReceives(ONE);
  const { data: accounts, isLoading: isAccountsLoading } = useAccounts();

  const userBankAccounts = (accounts ?? []).filter(
    (account) =>
      account.account_type === ACCOUNT_TYPE.BANK && !account.predefined,
  );

  const steps = buildFirstSteps({
    customers: customers?.pagination?.total ?? 0,
    items: items?.pagination?.total ?? 0,
    invoices: invoices?.pagination?.total ?? 0,
    paymentsReceived: payments?.pagination?.total ?? 0,
    userBankAccounts: userBankAccounts.length,
  });

  return {
    steps,
    doneCount: steps.filter((step) => step.done).length,
    allDone: steps.every((step) => step.done),
    isLoading:
      isCustomersLoading ||
      isItemsLoading ||
      isInvoicesLoading ||
      isPaymentsLoading ||
      isAccountsLoading,
  };
};
