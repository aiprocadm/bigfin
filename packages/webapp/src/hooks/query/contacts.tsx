import { useMutation, useQueryClient } from 'react-query';
import useApiRequest from '../useRequest';
import { useQueryTenant } from '../useQueryRequest';
import t from './types';

// Common invalidate queries.
const commonInvalidateQueries = (queryClient: any) => {
  // Invalidate vendors.
  queryClient.invalidateQueries(t.VENDORS);
  // Invalidate customers.
  queryClient.invalidateQueries(t.CUSTOMERS);
};

/**
 * Retrieve the contact duplicate.
 */
export function useContact(id: any, props: any) {
  const apiRequest = useApiRequest();

  return useQueryTenant(
    ['CONTACT', id],
    () => apiRequest.get(`contacts/${id}`),
    {
      select: (res: any) => res.data.customer,
      ...props,
    },
  );
}

/** Часть долга: закроется деньгами или поставкой. */
export interface DebtSide {
  money: number;
  goods: number;
  total: number;
}

export interface ContactDebtBreakdown {
  contactId: number;
  /** Нам должны. */
  receivable: DebtSide;
  /** Мы должны. */
  payable: DebtSide;
}

export interface DebtBreakdownResult {
  contacts: ContactDebtBreakdown[];
  totals: {
    receivable: DebtSide;
    payable: DebtSide;
    /** Авансы, полученные от покупателей: мы должны исполнение. */
    advancesReceived: number;
    /** Авансы, выданные поставщикам: нам должны поставку. */
    advancesPaid: number;
  };
}

/**
 * Денежная и неденежная задолженность (FIN-023 ТЗ-2).
 *
 * ЗАЧЕМ ОТДЕЛЬНЫМ ЗАПРОСОМ, А НЕ В СПИСКЕ. Разбор нужен и списку клиентов, и
 * списку поставщиков, и главной. Встроить его в каждый список значило бы
 * посчитать одно и то же трижды; здесь ответ один и переиспользуется.
 *
 * ОДИН ЗАПРОС НА СТРАНИЦУ, А НЕ НА СТРОКУ: ответ приходит сразу по всем
 * контрагентам с долгом.
 */
export function useContactDebtBreakdown(props?: any) {
  const apiRequest = useApiRequest();

  return useQueryTenant(
    ['CONTACTS', 'DEBT-BREAKDOWN'],
    () => apiRequest.get('contacts/debt-breakdown'),
    {
      select: (res: any): DebtBreakdownResult =>
        res.data ?? {
          contacts: [],
          totals: {
            receivable: { money: 0, goods: 0, total: 0 },
            payable: { money: 0, goods: 0, total: 0 },
            advancesReceived: 0,
            advancesPaid: 0,
          },
        },
      // Разбор — дополнение к списку, а не сам список: молчать при сбое лучше,
      // чем не показать контрагентов вовсе.
      retry: false,
      ...props,
    },
  );
}

/**
 * Разбор долга по номеру контрагента: готовая справочная таблица для строк
 * списка.
 */
export function debtByContactId(
  data?: DebtBreakdownResult,
): Map<number, ContactDebtBreakdown> {
  const byId = new Map<number, ContactDebtBreakdown>();

  (data?.contacts ?? []).forEach((row) => byId.set(Number(row.contactId), row));

  return byId;
}

/**
 * Retrieve the auto-complete contacts.
 */
export function useAutoCompleteContacts(props?: any) {
  const apiRequest = useApiRequest();

  return useQueryTenant(
    ['CONTACTS', 'AUTO-COMPLETE'],
    () => apiRequest.get('contacts/auto-complete'),
    {
      select: (res: any) => res.data,
      defaultData: [],
      ...props,
    },
  );
}

/**
 * Activate the given Contact.
 */
export function useActivateContact(props: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id: number) => apiRequest.patch(`contacts/${id}/activate`), {
    onSuccess: (res, id) => {
      // Invalidate specific contact.
      queryClient.invalidateQueries([t.CONTACT, id]);

      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Inactivate the given contact.
 */
export function useInactivateContact(props: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id: number) => apiRequest.patch(`contacts/${id}/inactivate`), {
    onSuccess: (res, id) => {
      // Invalidate specific item.
      queryClient.invalidateQueries([t.CONTACT, id]);

      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}
