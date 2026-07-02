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
import { withSalesByItems } from '../withSalesByItems';
import { withSalesByItemsActions } from '../withSalesByItemsActions';
import {
  getSalesByItemsHeaderSchema,
  type SalesByItemsHeaderFormValues,
} from './SalesByItemsHeader.zod';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (redux-HOC и хуки без типов).
// ---------------------------------------------------------------------------

/** Фильтр страницы отчёта (query из URL, форма легаси не меняется). */
type SalesByItemsPageFilter = Record<string, unknown>;

interface SalesByItemsHeaderOwnProps {
  pageFilter: SalesByItemsPageFilter;
  onSubmitFilter: (values: Record<string, unknown>) => void;
}

interface SalesByItemsHeaderReduxProps {
  // #withSalesByItems
  salesByItemsDrawerFilter: boolean;
  // #withSalesByItemsActions
  toggleSalesByItemsFilterDrawer: (toggle?: boolean) => void;
}

interface ItemOption {
  id: number | string;
  name: string;
}

const useItemsTyped = useItems as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => { data: { items: ItemOption[] }; isLoading: boolean };

const withSalesByItemsLoose = withSalesByItems as unknown as (
  mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withSalesByItemsActionsLoose = withSalesByItemsActions as unknown as (
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
  pageFilter: SalesByItemsPageFilter,
): SalesByItemsHeaderFormValues => ({
  dateRange: 'custom',
  fromDate: moment(pageFilter.fromDate as string | Date).toDate(),
  toDate: moment(pageFilter.toDate as string | Date).toDate(),
  filterByOption: toStr(pageFilter.filterByOption, 'with-transactions'),
  itemsIds: toIds(pageFilter.itemsIds),
});

// ---------------------------------------------------------------------------
// Выбор товарных позиций (замена ItemsMultiSelect).
// ---------------------------------------------------------------------------

function SalesByItemsItemsField() {
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
 * Панель настроек отчёта «Продажи по позициям» на общем shadcn-каркасе
 * (FinancialHeaderDrawer + общие поля + RHF/Zod). Вкладка одна — рендерим
 * поля без Tabs. Механизм открытия прежний: redux-флаг
 * salesByItemsDrawerFilter через withSalesByItems(Actions).
 */
function SalesByItemsHeaderV2Root({
  pageFilter,
  onSubmitFilter,
  salesByItemsDrawerFilter,
  toggleSalesByItemsFilterDrawer: toggleFilterDrawer,
}: SalesByItemsHeaderOwnProps & SalesByItemsHeaderReduxProps) {
  const schema = React.useMemo(() => getSalesByItemsHeaderSchema(), []);

  const form: UseFormReturn<SalesByItemsHeaderFormValues> =
    useForm<SalesByItemsHeaderFormValues>({
      resolver: zodResolver(schema),
      defaultValues: buildDefaultValues(pageFilter),
    });

  // При каждом открытии панель подхватывает актуальный query отчёта.
  React.useEffect(() => {
    if (salesByItemsDrawerFilter) {
      form.reset(buildDefaultValues(pageFilter));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesByItemsDrawerFilter]);

  const handleClose = () => {
    toggleFilterDrawer(false);
  };

  // Как в легаси: отдаём наверх весь фильтр (numberFormat и прочее — сквозняком).
  const onSubmit = (values: SalesByItemsHeaderFormValues) => {
    onSubmitFilter({ ...pageFilter, ...values });
    toggleFilterDrawer(false);
  };

  return (
    <FinancialHeaderDrawer
      isOpen={Boolean(salesByItemsDrawerFilter)}
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
            <SalesByItemsItemsField />
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

export const SalesByItemsHeaderV2 = compose(
  withSalesByItemsLoose(({ salesByItemsDrawerFilter }) => ({
    salesByItemsDrawerFilter,
  })),
  withSalesByItemsActionsLoose,
)(SalesByItemsHeaderV2Root) as React.ComponentType<SalesByItemsHeaderOwnProps>;
