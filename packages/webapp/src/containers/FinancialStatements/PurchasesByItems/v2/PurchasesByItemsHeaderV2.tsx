import * as React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useItems } from '@/hooks/query';
import { compose } from '@/utils';

import {
  FinancialHeaderDrawer,
  FinancialHeaderSkeleton,
  ReportDateRangeFields,
  ReportEntitiesField,
  ReportFilterOptionField,
  type ReportFilterOption,
} from '../../v2';
import { filterItemsOptions } from '../../constants';
import { withPurchasesByItems } from '../withPurchasesByItems';
import { withPurchasesByItemsActions } from '../withPurchasesByItemsActions';
import {
  getPurchasesByItemsHeaderSchema,
  type PurchasesByItemsHeaderFormValues,
} from './PurchasesByItemsHeader.zod';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (redux-HOC и хуки без типов).
// ---------------------------------------------------------------------------

/** Фильтр страницы отчёта (query из URL, форма легаси не меняется). */
type PurchasesByItemsPageFilter = Record<string, unknown>;

interface PurchasesByItemsHeaderOwnProps {
  pageFilter: PurchasesByItemsPageFilter;
  onSubmitFilter: (values: Record<string, unknown>) => void;
}

interface PurchasesByItemsHeaderReduxProps {
  // #withPurchasesByItems
  purchasesByItemsDrawerFilter: boolean;
  // #withPurchasesByItemsActions
  togglePurchasesByItemsFilterDrawer: (toggle?: boolean) => void;
}

interface ItemOption {
  id: number | string;
  name: string;
}

const useItemsTyped = useItems as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => { data: { items: ItemOption[] }; isLoading: boolean };

const withPurchasesByItemsLoose = withPurchasesByItems as unknown as (
  mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withPurchasesByItemsActionsLoose =
  withPurchasesByItemsActions as unknown as (
    component: React.ComponentType<any>,
  ) => React.ComponentType<any>;

const filterItemsPresets = filterItemsOptions as ReportFilterOption[];

// ---------------------------------------------------------------------------
// Значения формы из query отчёта.
// ---------------------------------------------------------------------------

const toStr = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const toIds = (value: unknown): Array<number | string> =>
  Array.isArray(value) ? (value as Array<number | string>) : [];

const buildDefaultValues = (
  pageFilter: PurchasesByItemsPageFilter,
): PurchasesByItemsHeaderFormValues => ({
  dateRange: 'custom',
  fromDate: moment(pageFilter.fromDate as string | Date).toDate(),
  toDate: moment(pageFilter.toDate as string | Date).toDate(),
  filterByOption: toStr(pageFilter.filterByOption, 'with-transactions'),
  itemsIds: toIds(pageFilter.itemsIds),
});

// ---------------------------------------------------------------------------
// Выбор товарных позиций (замена ItemsMultiSelect).
// ---------------------------------------------------------------------------

function PurchasesByItemsItemsField() {
  // Тот же запрос, что в легаси-провайдере: складские позиции без пагинации.
  const {
    data: { items },
    isLoading,
  } = useItemsTyped(
    {
      page_size: 10000,
      stringified_filter_roles: JSON.stringify([
        { fieldKey: 'type', comparator: 'is', value: 'inventory', index: 1 },
      ]),
    },
    { keepPreviousData: true },
  );

  if (isLoading) {
    return <FinancialHeaderSkeleton lines={1} />;
  }
  return (
    <ReportEntitiesField
      name="itemsIds"
      label={intl.get('Specific items')}
      items={items.map((item) => ({ id: item.id, name: item.name }))}
    />
  );
}

// ---------------------------------------------------------------------------
// Сама панель настроек отчёта.
// ---------------------------------------------------------------------------

/**
 * Панель настроек отчёта «Закупки по позициям» на общем shadcn-каркасе
 * (FinancialHeaderDrawer + общие поля + RHF/Zod). Вкладка одна — рендерим
 * поля без Tabs. Механизм открытия прежний: redux-флаг
 * purchasesByItemsDrawerFilter через withPurchasesByItems(Actions).
 */
function PurchasesByItemsHeaderV2Root({
  pageFilter,
  onSubmitFilter,
  purchasesByItemsDrawerFilter,
  togglePurchasesByItemsFilterDrawer: toggleFilterDrawer,
}: PurchasesByItemsHeaderOwnProps & PurchasesByItemsHeaderReduxProps) {
  const schema = React.useMemo(() => getPurchasesByItemsHeaderSchema(), []);

  const form: UseFormReturn<PurchasesByItemsHeaderFormValues> =
    useForm<PurchasesByItemsHeaderFormValues>({
      resolver: zodResolver(schema),
      defaultValues: buildDefaultValues(pageFilter),
    });

  // При каждом открытии панель подхватывает актуальный query отчёта.
  React.useEffect(() => {
    if (purchasesByItemsDrawerFilter) {
      form.reset(buildDefaultValues(pageFilter));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchasesByItemsDrawerFilter]);

  const handleClose = () => {
    toggleFilterDrawer(false);
  };

  // Как в легаси: отдаём наверх весь фильтр (numberFormat и прочее — сквозняком).
  const onSubmit = (values: PurchasesByItemsHeaderFormValues) => {
    onSubmitFilter({ ...pageFilter, ...values });
    toggleFilterDrawer(false);
  };

  return (
    <FinancialHeaderDrawer
      isOpen={Boolean(purchasesByItemsDrawerFilter)}
      onClose={handleClose}
      title={intl.get('customize_report')}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-4">
            <ReportDateRangeFields />
            <ReportFilterOptionField
              items={filterItemsPresets}
              label={intl.get('items.label_filter_items')}
            />
            <PurchasesByItemsItemsField />
          </div>

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

export const PurchasesByItemsHeaderV2 = compose(
  withPurchasesByItemsLoose(({ purchasesByItemsDrawerFilter }) => ({
    purchasesByItemsDrawerFilter,
  })),
  withPurchasesByItemsActionsLoose,
)(PurchasesByItemsHeaderV2Root) as React.ComponentType<PurchasesByItemsHeaderOwnProps>;
