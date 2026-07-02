import * as React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Features } from '@/constants';
import { useVendors } from '@/hooks/query';
import { useFeatureCan } from '@/hooks/state';
import { compose } from '@/utils';

import {
  FinancialHeaderDrawer,
  FinancialHeaderSkeleton,
  ReportAgingFields,
  ReportAsDateField,
  ReportBranchesField,
  ReportEntitiesField,
  ReportFilterOptionField,
  type ReportFilterOption,
} from '../../v2';
import { filterVendorsOptions } from '../constants';
import { withAPAgingSummary } from '../withAPAgingSummary';
import { withAPAgingSummaryActions } from '../withAPAgingSummaryActions';
import {
  getAPAgingSummaryHeaderSchema,
  type APAgingSummaryHeaderFormValues,
} from './APAgingSummaryHeader.zod';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (redux-HOC и хуки без типов).
// ---------------------------------------------------------------------------

/** Фильтр страницы отчёта (query из URL, форма легаси не меняется). */
type APAgingSummaryPageFilter = Record<string, unknown>;

interface APAgingSummaryHeaderOwnProps {
  pageFilter: APAgingSummaryPageFilter;
  onSubmitFilter: (values: Record<string, unknown>) => void;
}

interface APAgingSummaryHeaderReduxProps {
  // #withAPAgingSummary
  isFilterDrawerOpen: boolean;
  // #withAPAgingSummaryActions
  toggleAPAgingSummaryFilterDrawer: (toggle?: boolean) => void;
}

interface VendorOption {
  id: number | string;
  display_name: string;
}

const useVendorsTyped = useVendors as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => { data: { vendors: VendorOption[] }; isLoading: boolean };

const withAPAgingSummaryLoose = withAPAgingSummary as unknown as (
  mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withAPAgingSummaryActionsLoose =
  withAPAgingSummaryActions as unknown as (
    component: React.ComponentType<any>,
  ) => React.ComponentType<any>;

const filterVendorsPresets = filterVendorsOptions as ReportFilterOption[];

// ---------------------------------------------------------------------------
// Значения формы из query отчёта.
// ---------------------------------------------------------------------------

const toStr = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const toNum = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toIds = (value: unknown): Array<number | string> =>
  Array.isArray(value) ? (value as Array<number | string>) : [];

const buildDefaultValues = (
  pageFilter: APAgingSummaryPageFilter,
): APAgingSummaryHeaderFormValues => ({
  asDate: moment(pageFilter.asDate as string | Date).toDate(),
  agingDaysBefore: toNum(pageFilter.agingDaysBefore, 30),
  agingPeriods: toNum(pageFilter.agingPeriods, 3),
  filterByOption: toStr(pageFilter.filterByOption, 'without-zero-balance'),
  vendorsIds: toIds(pageFilter.vendorsIds),
  branchesIds: toIds(pageFilter.branchesIds),
});

// ---------------------------------------------------------------------------
// Выбор поставщиков (замена VendorsMultiSelect).
// ---------------------------------------------------------------------------

function APAgingSummaryVendorsField() {
  const {
    data: { vendors },
    isLoading,
  } = useVendorsTyped({}, { keepPreviousData: true });

  if (isLoading) {
    return <FinancialHeaderSkeleton lines={1} />;
  }
  return (
    <ReportEntitiesField
      name="vendorsIds"
      label={intl.get('specific_vendors')}
      items={vendors.map((vendor) => ({
        id: vendor.id,
        name: vendor.display_name,
      }))}
    />
  );
}

// ---------------------------------------------------------------------------
// Сама панель настроек отчёта.
// ---------------------------------------------------------------------------

/**
 * Панель настроек отчёта «Кредиторка по срокам» на общем shadcn-каркасе
 * (FinancialHeaderDrawer + общие поля + RHF/Zod). Механизм открытия прежний:
 * redux-флаг APAgingSummaryFilterDrawer через withAPAgingSummary(Actions).
 */
function APAgingSummaryHeaderV2Root({
  pageFilter,
  onSubmitFilter,
  isFilterDrawerOpen,
  toggleAPAgingSummaryFilterDrawer: toggleFilterDrawer,
}: APAgingSummaryHeaderOwnProps & APAgingSummaryHeaderReduxProps) {
  const { featureCan } = useFeatureCan();
  const isBranchesFeatureCan = featureCan(Features.Branches);

  const schema = React.useMemo(() => getAPAgingSummaryHeaderSchema(), []);

  const form: UseFormReturn<APAgingSummaryHeaderFormValues> =
    useForm<APAgingSummaryHeaderFormValues>({
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
  const onSubmit = (values: APAgingSummaryHeaderFormValues) => {
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
              {isBranchesFeatureCan ? (
                <TabsTrigger value="dimensions">
                  {intl.get('dimensions')}
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="general" className="pt-5">
              <div className="flex flex-col gap-4">
                <ReportAsDateField />
                <ReportAgingFields />
                <ReportFilterOptionField
                  items={filterVendorsPresets}
                  label={intl.get('AP_aging_summary.filter_options.label')}
                />
                <APAgingSummaryVendorsField />
              </div>
            </TabsContent>

            {isBranchesFeatureCan ? (
              <TabsContent value="dimensions" className="pt-5">
                <ReportBranchesField />
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

export const APAgingSummaryHeaderV2 = compose(
  withAPAgingSummaryActionsLoose,
  withAPAgingSummaryLoose(({ APAgingSummaryFilterDrawer }) => ({
    isFilterDrawerOpen: APAgingSummaryFilterDrawer,
  })),
)(APAgingSummaryHeaderV2Root) as React.ComponentType<APAgingSummaryHeaderOwnProps>;
