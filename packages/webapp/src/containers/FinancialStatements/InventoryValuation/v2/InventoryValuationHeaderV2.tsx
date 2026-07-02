import * as React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Features } from '@/constants';
import { useItems, useWarehouses } from '@/hooks/query';
import { useFeatureCan } from '@/hooks/state';
import { compose } from '@/utils';

import {
  FinancialHeaderDrawer,
  FinancialHeaderSkeleton,
  ReportAsDateField,
  ReportBranchesField,
  ReportEntitiesField,
  ReportFilterOptionField,
  type ReportFilterOption,
} from '../../v2';
import { filterInventoryValuationOptions } from '../../constants';
import { withInventoryValuation } from '../withInventoryValuation';
import { withInventoryValuationActions } from '../withInventoryValuationActions';
import {
  getInventoryValuationHeaderSchema,
  type InventoryValuationHeaderFormValues,
} from './InventoryValuationHeader.zod';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (redux-HOC и хуки без типов).
// ---------------------------------------------------------------------------

/** Фильтр страницы отчёта (query из URL, форма легаси не меняется). */
type InventoryValuationPageFilter = Record<string, unknown>;

interface InventoryValuationHeaderOwnProps {
  pageFilter: InventoryValuationPageFilter;
  onSubmitFilter: (values: Record<string, unknown>) => void;
}

interface InventoryValuationHeaderReduxProps {
  // #withInventoryValuation
  isFilterDrawerOpen: boolean;
  // #withInventoryValuationActions
  toggleInventoryValuationFilterDrawer: (toggle?: boolean) => void;
}

interface ItemOption {
  id: number | string;
  name: string;
}

const useItemsTyped = useItems as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => { data: { items?: ItemOption[] } | undefined; isLoading: boolean };

interface WarehouseOption {
  id: number | string;
  name: string;
}

const useWarehousesTyped = useWarehouses as unknown as (
  query: Record<string, unknown> | null,
  props: Record<string, unknown>,
) => { data?: WarehouseOption[]; isLoading: boolean };

const withInventoryValuationLoose = withInventoryValuation as unknown as (
  mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withInventoryValuationActionsLoose =
  withInventoryValuationActions as unknown as (
    component: React.ComponentType<any>,
  ) => React.ComponentType<any>;

/** Опции фильтра позиций (легаси-модуль constants без типов). */
const filterItemsOptions =
  filterInventoryValuationOptions as ReportFilterOption[];

// ---------------------------------------------------------------------------
// Значения формы из query отчёта.
// ---------------------------------------------------------------------------

const toStr = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const toIds = (value: unknown): Array<number | string> =>
  Array.isArray(value) ? (value as Array<number | string>) : [];

const buildDefaultValues = (
  pageFilter: InventoryValuationPageFilter,
): InventoryValuationHeaderFormValues => ({
  asDate: moment(pageFilter.asDate as string | Date).toDate(),
  filterByOption: toStr(pageFilter.filterByOption, 'with-transactions'),
  itemsIds: toIds(pageFilter.itemsIds),
  branchesIds: toIds(pageFilter.branchesIds),
  warehousesIds: toIds(pageFilter.warehousesIds),
});

// ---------------------------------------------------------------------------
// Мелкие блоки формы.
// ---------------------------------------------------------------------------

/** Выбор определённых товаров (замена легаси ItemsMultiSelect). */
function InventoryValuationItemsField() {
  // Как в легаси: только складские позиции (type = inventory).
  const { data, isLoading } = useItemsTyped(
    {
      stringified_filter_roles: JSON.stringify([
        { fieldKey: 'type', comparator: 'is', value: 'inventory', index: 1 },
      ]),
      page_size: 10000,
    },
    { keepPreviousData: true },
  );

  if (isLoading) {
    return <FinancialHeaderSkeleton />;
  }
  return (
    <ReportEntitiesField
      name="itemsIds"
      label={intl.get('Specific items')}
      items={(data?.items ?? []).map((item) => ({
        id: item.id,
        name: item.name,
      }))}
    />
  );
}

/** Выбор складов (замена легаси WarehouseMultiSelect). */
function InventoryValuationWarehousesField() {
  const { data: warehouses, isLoading } = useWarehousesTyped(null, {
    keepPreviousData: true,
  });

  if (isLoading) {
    return <FinancialHeaderSkeleton />;
  }
  return (
    <ReportEntitiesField
      name="warehousesIds"
      label={intl.get('warehouses_multi_select.label')}
      items={(warehouses ?? []).map((warehouse) => ({
        id: warehouse.id,
        name: warehouse.name,
      }))}
    />
  );
}

// ---------------------------------------------------------------------------
// Сама панель настроек «Оценки запасов».
// ---------------------------------------------------------------------------

/**
 * Панель настроек отчёта «Оценка запасов» на общем shadcn-каркасе
 * (FinancialHeaderDrawer + общие поля + RHF/Zod). Механизм открытия прежний:
 * redux-флаг inventoryValuationDrawerFilter через
 * withInventoryValuation/withInventoryValuationActions.
 */
function InventoryValuationHeaderV2Root({
  pageFilter,
  onSubmitFilter,
  isFilterDrawerOpen,
  toggleInventoryValuationFilterDrawer: toggleFilterDrawer,
}: InventoryValuationHeaderOwnProps & InventoryValuationHeaderReduxProps) {
  const { featureCan } = useFeatureCan();
  const isBranchesFeatureCan = featureCan(Features.Branches);
  const isWarehousesFeatureCan = featureCan(Features.Warehouses);
  const hasDimensionsTab = isBranchesFeatureCan || isWarehousesFeatureCan;

  const schema = React.useMemo(() => getInventoryValuationHeaderSchema(), []);

  const form = useForm<InventoryValuationHeaderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(pageFilter),
  });

  // При каждом открытии панель подхватывает актуальный query отчёта.
  React.useEffect(() => {
    if (isFilterDrawerOpen) {
      form.reset(buildDefaultValues(pageFilter));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFilterDrawerOpen]);

  const handleClose = () => {
    toggleFilterDrawer(false);
  };

  // Как в легаси: отдаём наверх весь фильтр (numberFormat и прочее — сквозняком).
  const onSubmit = (values: InventoryValuationHeaderFormValues) => {
    onSubmitFilter({ ...pageFilter, ...values });
    toggleFilterDrawer(false);
  };

  return (
    <FinancialHeaderDrawer
      isOpen={Boolean(isFilterDrawerOpen)}
      onClose={handleClose}
      title={intl.get('customize_report')}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">{intl.get('general')}</TabsTrigger>
              {hasDimensionsTab ? (
                <TabsTrigger value="dimensions">
                  {intl.get('dimensions')}
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="general" className="pt-5">
              <div className="flex flex-col gap-4">
                <ReportAsDateField />
                <ReportFilterOptionField
                  items={filterItemsOptions}
                  label={intl.get('items.label_filter_items')}
                />
                <InventoryValuationItemsField />
              </div>
            </TabsContent>

            {hasDimensionsTab ? (
              <TabsContent value="dimensions" className="pt-5">
                <div className="flex flex-col gap-4">
                  {isBranchesFeatureCan ? <ReportBranchesField /> : null}
                  {isWarehousesFeatureCan ? (
                    <InventoryValuationWarehousesField />
                  ) : null}
                </div>
              </TabsContent>
            ) : null}
          </Tabs>

          <div className="flex items-center gap-2 border-t border-border pt-4">
            <Button type="submit">{intl.get('calculate_report')}</Button>
            <Button type="button" variant="ghost" onClick={handleClose}>
              {intl.get('cancel')}
            </Button>
          </div>
        </form>
      </Form>
    </FinancialHeaderDrawer>
  );
}

export const InventoryValuationHeaderV2 = compose(
  withInventoryValuationLoose(({ inventoryValuationDrawerFilter }) => ({
    isFilterDrawerOpen: inventoryValuationDrawerFilter,
  })),
  withInventoryValuationActionsLoose,
)(
  InventoryValuationHeaderV2Root,
) as React.ComponentType<InventoryValuationHeaderOwnProps>;
