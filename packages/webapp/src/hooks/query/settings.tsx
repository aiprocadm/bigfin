import { useMutation, useQueryClient } from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import { useSetSettings } from '@/hooks/state';
import t from './types';
import { useEffect } from 'react';

/**
 * Saves the settings.
 */
export function useSaveSettings(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((settings) => apiRequest.put('settings', settings), {
    onSuccess: () => {
      queryClient.invalidateQueries(t.SETTING);
    },
    ...props,
  });
}

function useSettingsQuery(key: any, query: any, props?: any) {
  const setSettings = useSetSettings();

  const settingsQuery = useRequestQuery(
    key,
    { method: 'get', url: 'settings', params: query },
    {
      select: (res: any) => res.data,
      defaultData: [],
      ...props,
    },
  );
  useEffect(() => {
    // Sync to Redux state if the reqeust success and is not fetching.
    if (!settingsQuery.isFetching && settingsQuery.isSuccess) {
      setSettings(settingsQuery.data);
    }
  }, [settingsQuery.isFetching, settingsQuery.isSuccess, settingsQuery.data]);

  return settingsQuery;
}

/**
 * Retrieve the all settings of the organization.
 */
export function useSettings() {
  return useSettingsQuery([t.SETTING, 'ALL'], {});
}

/**
 * Retrieve invoices settings.
 */
export function useSettingsInvoices(props?: any) {
  return useSettingsQuery(
    [t.SETTING, t.SETTING_INVOICES],
    { group: 'sale_invoices' },
    props,
  );
}

/**
 * Retrieve invoices settings.
 */
export function useSettingsEstimates(props?: any) {
  return useSettingsQuery(
    [t.SETTING, t.SETTING_ESTIMATES],
    { group: 'sale_estimates' },
    props,
  );
}

/**
 * Retrieve payment receives settings.
 */
export function useSettingsPaymentReceives(props?: any) {
  return useSettingsQuery(
    [t.SETTING, t.SETTING_PAYMENT_RECEIVES],
    { group: 'payment_receives' },
    props,
  );
}

/**
 * Retrieve sale receipts settings.
 * @param {*} props
 */
export function useSettingsReceipts(props?: any) {
  return useSettingsQuery(
    [t.SETTING, t.SETTING_RECEIPTS],
    { group: 'sale_receipts' },
    props,
  );
}

/**
 * Retrieve sale receipts settings.
 * @param {*} props
 */
export function useSettingsManualJournals(props?: any) {
  return useSettingsQuery(
    [t.SETTING, t.SETTING_MANUAL_JOURNALS],
    { group: 'manual_journals' },
    props,
  );
}

/**
 * Retrieve sale receipts settings.
 * @param {*} props
 */
export function useSettingsItems(props?: any) {
  return useSettingsQuery(
    [t.SETTING, t.SETTING_ITEMS],
    { group: 'items' },
    props,
  );
}

/**
 * Retrieve cashflow settings.
 */
export function useSettingCashFlow(props?: any) {
  return useSettingsQuery(
    [t.SETTING, t.SETTING_CASHFLOW],
    { group: 'cashflow' },
    props,
  );
}

/**
 * Retrieve credit notes settings.
 */
export function useSettingsCreditNotes(props?: any) {
  return useSettingsQuery(
    [t.SETTING, t.SETTING_CREDIT_NOTES],
    { group: 'credit_note' },
    props,
  );
}
/**
 * Retrieve vendor credit settings.
 */
export function useSettingsVendorCredits(props?: any) {
  return useSettingsQuery(
    [t.SETTING, t.SETTING_VENDOR_CREDITS],
    { group: 'vendor_credit' },
    props,
  );
}

/**
 * Retrieve warehouse transfer settings.
 */
export function useSettingsWarehouseTransfers(props?: any) {
  return useSettingsQuery(
    [t.SETTING, t.SETTING_WAREHOUSE_TRANSFERS],
    { group: 'warehouse_transfers' },
    props,
  );
}

