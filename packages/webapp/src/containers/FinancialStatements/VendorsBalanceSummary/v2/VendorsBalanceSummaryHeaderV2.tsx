import * as React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useVendors } from '@/hooks/query';
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
import { filterVendorsOptions } from '../../constants';
import { withVendorsBalanceSummary } from '../withVendorsBalanceSummary';
import { withVendorsBalanceSummaryActions } from '../withVendorsBalanceSummaryActions';
import {
  getVendorsBalanceSummaryHeaderSchema,
  type VendorsBalanceSummaryHeaderFormValues,
} from './VendorsBalanceSummaryHeader.zod';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (redux-HOC и хуки без типов).
// ---------------------------------------------------------------------------

/** Фильтр страницы отчёта (query из URL, форма легаси не меняется). */
type VendorsBalancePageFilter = Record<string, unknown>;

interface VendorsBalanceHeaderOwnProps {
  pageFilter: VendorsBalancePageFilter;
  onSubmitFilter: (values: Record<string, unknown>) => void;
}

interface VendorsBalanceHeaderReduxProps {
  // #withVendorsBalanceSummary
  VendorsSummaryFilterDrawer: boolean;
  // #withVendorsBalanceSummaryActions
  toggleVendorSummaryFilterDrawer: (toggle?: boolean) => void;
}

interface VendorOption {
  id: number | string;
  display_name: string;
}

const useVendorsTyped = useVendors as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => {
  data: { vendors?: VendorOption[] } | undefined;
  isLoading: boolean;
};

const withVendorsBalanceSummaryLoose =
  withVendorsBalanceSummary as unknown as (
    mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
  ) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withVendorsBalanceSummaryActionsLoose =
  withVendorsBalanceSummaryActions as unknown as (
    component: React.ComponentType<any>,
  ) => React.ComponentType<any>;

/** Опции фильтра поставщиков (легаси-модуль constants без типов). */
const vendorsFilterOptions = filterVendorsOptions as ReportFilterOption[];

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
  pageFilter: VendorsBalancePageFilter,
): VendorsBalanceSummaryHeaderFormValues => ({
  asDate: moment(pageFilter.asDate as string | Date).toDate(),
  percentage_column: toBool(pageFilter.percentage_column),
  filterByOption: toStr(pageFilter.filterByOption, 'with-transactions'),
  vendorsIds: toIds(pageFilter.vendorsIds),
});

// ---------------------------------------------------------------------------
// Мелкие блоки формы.
// ---------------------------------------------------------------------------

/** Выбор определённых поставщиков (замена легаси VendorsMultiSelect). */
function VendorsBalanceVendorsField() {
  // Как в легаси: полный список без пагинации.
  const { data, isLoading } = useVendorsTyped(
    { page_size: 1000000 },
    { keepPreviousData: true },
  );

  if (isLoading) {
    return <FinancialHeaderSkeleton />;
  }
  return (
    <ReportEntitiesField
      name="vendorsIds"
      label={intl.get('specific_vendors')}
      items={(data?.vendors ?? []).map((vendor) => ({
        id: vendor.id,
        name: vendor.display_name,
      }))}
    />
  );
}

/** Галочка «% от столбца» (легаси-имя поля percentage_column сохраняем). */
function VendorsBalancePercentageField({
  form,
}: {
  form: UseFormReturn<VendorsBalanceSummaryHeaderFormValues>;
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
// Сама панель настроек «Сальдо по поставщикам».
// ---------------------------------------------------------------------------

/**
 * Панель настроек отчёта «Сальдо по поставщикам» на общем shadcn-каркасе
 * (FinancialHeaderDrawer + общие поля + RHF/Zod). Единственная секция —
 * вкладки не нужны. Механизм открытия прежний: redux-флаг
 * VendorsSummaryFilterDrawer через withVendorsBalanceSummary(+Actions).
 */
function VendorsBalanceSummaryHeaderV2Root({
  pageFilter,
  onSubmitFilter,
  VendorsSummaryFilterDrawer,
  toggleVendorSummaryFilterDrawer: toggleFilterDrawer,
}: VendorsBalanceHeaderOwnProps & VendorsBalanceHeaderReduxProps) {
  const schema = React.useMemo(
    () => getVendorsBalanceSummaryHeaderSchema(),
    [],
  );

  const form = useForm<VendorsBalanceSummaryHeaderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(pageFilter),
  });

  // При каждом открытии панель подхватывает актуальный query отчёта.
  React.useEffect(() => {
    if (VendorsSummaryFilterDrawer) {
      form.reset(buildDefaultValues(pageFilter));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [VendorsSummaryFilterDrawer]);

  const handleClose = () => {
    toggleFilterDrawer(false);
  };

  // Как в легаси: отдаём наверх весь фильтр (numberFormat и прочее — сквозняком).
  const onSubmit = (values: VendorsBalanceSummaryHeaderFormValues) => {
    onSubmitFilter({ ...pageFilter, ...values });
    toggleFilterDrawer(false);
  };

  return (
    <FinancialHeaderDrawer
      isOpen={Boolean(VendorsSummaryFilterDrawer)}
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
            <VendorsBalancePercentageField form={form} />
            <ReportFilterOptionField
              items={vendorsFilterOptions}
              label={intl.get('vendors.label_filter_vendors')}
            />
            <VendorsBalanceVendorsField />
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

export const VendorsBalanceSummaryHeaderV2 = compose(
  withVendorsBalanceSummaryLoose(({ VendorsSummaryFilterDrawer }) => ({
    VendorsSummaryFilterDrawer,
  })),
  withVendorsBalanceSummaryActionsLoose,
)(
  VendorsBalanceSummaryHeaderV2Root,
) as React.ComponentType<VendorsBalanceHeaderOwnProps>;
