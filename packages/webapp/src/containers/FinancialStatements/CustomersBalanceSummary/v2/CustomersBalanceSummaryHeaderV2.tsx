import * as React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useCustomers } from '@/hooks/query';
import { compose } from '@/utils';

import {
  FinancialHeaderDrawer,
  FinancialHeaderSkeleton,
  ReportAsDateField,
  ReportCheckboxRow,
  ReportEntitiesField,
  ReportFilterOptionField,
  type ReportFilterOption,
} from '../../v2';
import { filterCustomersOptions } from '../../constants';
import { withCustomersBalanceSummary } from '../withCustomersBalanceSummary';
import { withCustomersBalanceSummaryActions } from '../withCustomersBalanceSummaryActions';
import {
  getCustomersBalanceSummaryHeaderSchema,
  type CustomersBalanceSummaryHeaderFormValues,
} from './CustomersBalanceSummaryHeader.zod';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (redux-HOC и хуки без типов).
// ---------------------------------------------------------------------------

/** Фильтр страницы отчёта (query из URL, форма легаси не меняется). */
type CustomersBalancePageFilter = Record<string, unknown>;

interface CustomersBalanceHeaderOwnProps {
  pageFilter: CustomersBalancePageFilter;
  onSubmitFilter: (values: Record<string, unknown>) => void;
}

interface CustomersBalanceHeaderReduxProps {
  // #withCustomersBalanceSummary
  customersBalanceDrawerFilter: boolean;
  // #withCustomersBalanceSummaryActions
  toggleCustomerBalanceFilterDrawer: (toggle?: boolean) => void;
}

interface CustomerOption {
  id: number | string;
  display_name: string;
}

const useCustomersTyped = useCustomers as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => {
  data: { customers?: CustomerOption[] } | undefined;
  isLoading: boolean;
};

const withCustomersBalanceSummaryLoose =
  withCustomersBalanceSummary as unknown as (
    mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
  ) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withCustomersBalanceSummaryActionsLoose =
  withCustomersBalanceSummaryActions as unknown as (
    component: React.ComponentType<any>,
  ) => React.ComponentType<any>;

/** Опции фильтра клиентов (легаси-модуль constants без типов). */
const customersFilterOptions = filterCustomersOptions as ReportFilterOption[];

// ---------------------------------------------------------------------------
// Значения формы из query отчёта.
// ---------------------------------------------------------------------------

/** Из URL булевы флаги могут прийти строками 'true'/'false'. */
const toBool = (value: unknown): boolean =>
  value === true || value === 'true' || value === '1';

const toStr = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const toIds = (value: unknown): Array<number | string> =>
  Array.isArray(value) ? (value as Array<number | string>) : [];

const buildDefaultValues = (
  pageFilter: CustomersBalancePageFilter,
): CustomersBalanceSummaryHeaderFormValues => ({
  asDate: moment(pageFilter.asDate as string | Date).toDate(),
  percentage_column: toBool(pageFilter.percentage_column),
  filterByOption: toStr(pageFilter.filterByOption, 'with-transactions'),
  customersIds: toIds(pageFilter.customersIds),
});

// ---------------------------------------------------------------------------
// Мелкие блоки формы.
// ---------------------------------------------------------------------------

/** Выбор определённых клиентов (замена легаси CustomersMultiSelect). */
function CustomersBalanceCustomersField() {
  const { data, isLoading } = useCustomersTyped({}, { keepPreviousData: true });

  if (isLoading) {
    return <FinancialHeaderSkeleton />;
  }
  return (
    <ReportEntitiesField
      name="customersIds"
      label={intl.get('specific_customers')}
      items={(data?.customers ?? []).map((customer) => ({
        id: customer.id,
        name: customer.display_name,
      }))}
    />
  );
}

/** Галочка «% от столбца» (легаси-имя поля percentage_column сохраняем). */
function CustomersBalancePercentageField({
  form,
}: {
  form: UseFormReturn<CustomersBalanceSummaryHeaderFormValues>;
}) {
  return (
    <ReportCheckboxRow
      label={intl.get('percentage_of_column')}
      checked={form.watch('percentage_column')}
      onCheckedChange={(checked) => form.setValue('percentage_column', checked)}
    />
  );
}

// ---------------------------------------------------------------------------
// Сама панель настроек «Сальдо по клиентам».
// ---------------------------------------------------------------------------

/**
 * Панель настроек отчёта «Сальдо по клиентам» на общем shadcn-каркасе
 * (FinancialHeaderDrawer + общие поля + RHF/Zod). Единственная секция —
 * вкладки не нужны. Механизм открытия прежний: redux-флаг
 * customersBalanceDrawerFilter через withCustomersBalanceSummary(+Actions).
 */
function CustomersBalanceSummaryHeaderV2Root({
  pageFilter,
  onSubmitFilter,
  customersBalanceDrawerFilter,
  toggleCustomerBalanceFilterDrawer: toggleFilterDrawer,
}: CustomersBalanceHeaderOwnProps & CustomersBalanceHeaderReduxProps) {
  const schema = React.useMemo(
    () => getCustomersBalanceSummaryHeaderSchema(),
    [],
  );

  const form = useForm<CustomersBalanceSummaryHeaderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(pageFilter),
  });

  // При каждом открытии панель подхватывает актуальный query отчёта.
  React.useEffect(() => {
    if (customersBalanceDrawerFilter) {
      form.reset(buildDefaultValues(pageFilter));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customersBalanceDrawerFilter]);

  const handleClose = () => {
    toggleFilterDrawer(false);
  };

  // Как в легаси: отдаём наверх весь фильтр (numberFormat и прочее — сквозняком).
  const onSubmit = (values: CustomersBalanceSummaryHeaderFormValues) => {
    onSubmitFilter({ ...pageFilter, ...values });
    toggleFilterDrawer(false);
  };

  return (
    <FinancialHeaderDrawer
      isOpen={Boolean(customersBalanceDrawerFilter)}
      onClose={handleClose}
      title={intl.get('customize_report')}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-4">
            <ReportAsDateField />
            <CustomersBalancePercentageField form={form} />
            <ReportFilterOptionField
              items={customersFilterOptions}
              label={intl.get('customers.label_filter_customers')}
            />
            <CustomersBalanceCustomersField />
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

export const CustomersBalanceSummaryHeaderV2 = compose(
  withCustomersBalanceSummaryLoose(({ customersBalanceDrawerFilter }) => ({
    customersBalanceDrawerFilter,
  })),
  withCustomersBalanceSummaryActionsLoose,
)(
  CustomersBalanceSummaryHeaderV2Root,
) as React.ComponentType<CustomersBalanceHeaderOwnProps>;
