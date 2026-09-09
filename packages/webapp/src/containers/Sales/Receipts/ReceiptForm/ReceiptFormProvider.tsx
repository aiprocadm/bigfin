import React, { createContext, useState } from 'react';
import type { ProviderProps } from '@/utils/formTypes';
import { Features } from '@/constants';
import { useFeatureCan } from '@/hooks/state';
import { DashboardInsider } from '@/components/Dashboard';
import {
  useReceipt,
  useAccounts,
  useSettingsReceipts,
  useCustomers,
  useWarehouses,
  useBranches,
  useItems,
  useCreateReceipt,
  useEditReceipt,
  useGetReceiptState,
  IGetReceiptStateResponse,
} from '@/hooks/query';
import { useProjects } from '@/containers/Projects/hooks';
import { useGetPdfTemplates } from '@/hooks/query/pdf-templates';

const ReceiptFormContext = createContext<ReceiptFormProviderValue>(
  {} as ReceiptFormProviderValue,
);

interface ReceiptFormProviderValue {
  isSaleReceiptStateLoading: boolean;
  /** Пока ответ не пришёл, состояния нет. */
  saleReceiptState?: IGetReceiptStateResponse;
  // Остальное, что кладёт поставщик. Тип пока не описан — до этой карты
  // эти поля не были объявлены вовсе, и каждое чтение считалось ошибкой.
  receiptId: any;
  receipt: any;
  accounts: any;
  customers: any;
  items: any;
  branches: any;
  warehouses: any;
  projects: any;
  submitPayload: any;
  isNewMode: any;
  isReceiptLoading: any;
  isAccountsLoading: any;
  isCustomersLoading: any;
  isItemsLoading: any;
  isWarehouesLoading: any;
  isBranchesLoading: any;
  isFeatureLoading: any;
  isSettingLoading: any;
  isBranchesSuccess: any;
  isWarehousesSuccess: any;
  createReceiptMutate: any;
  editReceiptMutate: any;
  setSubmitPayload: any;
  brandingTemplates: any;
  isBrandingTemplatesLoading: any;
  isBootLoading: any;

}

/**
 * Receipt form provider.
 */
function ReceiptFormProvider({
  receiptId,
  ...props
}: ProviderProps<{ receiptId?: number }>) {
  // Features guard.
  const { featureCan } = useFeatureCan();
  const isWarehouseFeatureCan = featureCan(Features.Warehouses);
  const isBranchFeatureCan = featureCan(Features.Branches);
  const isProjectsFeatureCan = featureCan(Features.Projects);

  // Fetch sale receipt details.
  const { data: receipt, isLoading: isReceiptLoading } = useReceipt(receiptId, {
    enabled: !!receiptId,
  });
  // Fetch accounts list.
  const { data: accounts, isLoading: isAccountsLoading } = useAccounts();

  // Fetch customers list.
  const {
    data: { customers },
    isLoading: isCustomersLoading,
  } = useCustomers({ page_size: 10000 });

  // Fetch warehouses list.
  const {
    data: warehouses,
    isLoading: isWarehouesLoading,
    isSuccess: isWarehousesSuccess,
  } = useWarehouses({}, { enabled: isWarehouseFeatureCan });

  // Fetches the branches list.
  const {
    data: branches,
    isLoading: isBranchesLoading,
    isSuccess: isBranchesSuccess,
  } = useBranches({}, { enabled: isBranchFeatureCan });

  // Filter all sellable items only.
  const stringifiedFilterRoles = React.useMemo(
    () =>
      JSON.stringify([
        {
          index: 1,
          fieldKey: 'sellable',
          value: true,
          condition: '&&',
          comparator: 'equals',
        },
        {
          index: 2,
          fieldKey: 'active',
          value: true,
          condition: '&&',
          comparator: 'equals',
        },
      ]),
    [],
  );

  // Handle fetch Items data table or list.
  const {
    data: { items },
    isLoading: isItemsLoading,
  } = useItems({
    page_size: 10000,
    stringified_filter_roles: stringifiedFilterRoles,
  });
  // Fetch project list.
  const {
    data: { projects },
    isLoading: isProjectsLoading,
  } = useProjects({}, { enabled: !!isProjectsFeatureCan });

  // Fetches branding templates of receipt.
  const { data: brandingTemplates, isLoading: isBrandingTemplatesLoading } =
    useGetPdfTemplates({ resource: 'SaleReceipt' });

  // Fetches the sale receipt state.
  const { data: saleReceiptState, isLoading: isSaleReceiptStateLoading } =
    useGetReceiptState();

  // Fetch receipt settings.
  const { isLoading: isSettingLoading } = useSettingsReceipts();

  const { mutateAsync: createReceiptMutate } = useCreateReceipt();
  const { mutateAsync: editReceiptMutate } = useEditReceipt();

  const [submitPayload, setSubmitPayload] = useState({});

  const isNewMode = !receiptId;
  const isFeatureLoading = isWarehouesLoading || isBranchesLoading;

  const isBootLoading =
    isReceiptLoading ||
    isAccountsLoading ||
    isCustomersLoading ||
    isItemsLoading ||
    isSettingLoading ||
    isBrandingTemplatesLoading ||
    isSaleReceiptStateLoading;

  const provider = {
    receiptId,
    receipt,
    accounts,
    customers,
    items,
    branches,
    warehouses,
    projects,
    submitPayload,

    isNewMode,
    isReceiptLoading,
    isAccountsLoading,
    isCustomersLoading,
    isItemsLoading,
    isWarehouesLoading,
    isBranchesLoading,
    isFeatureLoading,
    isSettingLoading,
    isBranchesSuccess,
    isWarehousesSuccess,

    createReceiptMutate,
    editReceiptMutate,
    setSubmitPayload,

    // Branding templates
    brandingTemplates,
    isBrandingTemplatesLoading,

    // State
    isSaleReceiptStateLoading,
    saleReceiptState,

    isBootLoading,
  };
  return <ReceiptFormContext.Provider value={provider} {...props} />;
}

const useReceiptFormContext = () =>
  React.useContext<ReceiptFormProviderValue>(ReceiptFormContext);

export { ReceiptFormProvider, useReceiptFormContext };
