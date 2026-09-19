import * as React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Features } from '@/constants';
import { useFeatureCan } from '@/hooks/state';
import { compose } from '@/utils';

import {
  FinancialHeaderDrawer,
  ReportBranchesField,
  ReportCheckboxRow,
  ReportDateRangeFields,
  ReportDisplayColumnsByField,
  ReportFilterOptionField,
} from '../../v2';
import { withBalanceSheet } from '../withBalanceSheet';
import { withBalanceSheetActions } from '../withBalanceSheetActions';
import {
  getBalanceSheetHeaderSchema,
  type BalanceSheetHeaderFormValues,
} from './BalanceSheetHeader.zod';
import { ReportLegalEntitiesField } from '@/containers/FinancialStatements/v2/FinancialHeaderLegalEntitiesField';
import { ReportDirectionsField } from '@/containers/FinancialStatements/v2/FinancialHeaderDirectionsField';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (redux-HOC без типов).
// ---------------------------------------------------------------------------

/** Фильтр страницы отчёта (query из URL, форма легаси не меняется). */
type BalanceSheetPageFilter = Record<string, unknown>;

interface BalanceSheetHeaderOwnProps {
  pageFilter: BalanceSheetPageFilter;
  onSubmitFilter: (values: Record<string, unknown>) => void;
}

interface BalanceSheetHeaderReduxProps {
  // #withBalanceSheet
  balanceSheetDrawerFilter: boolean;
  // #withBalanceSheetActions
  toggleBalanceSheetFilterDrawer: (toggle?: boolean) => void;
}

const withBalanceSheetLoose = withBalanceSheet as unknown as (
  mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withBalanceSheetActionsLoose = withBalanceSheetActions as unknown as (
  component: React.ComponentType<any>,
) => React.ComponentType<any>;

// ---------------------------------------------------------------------------
// Значения формы из query отчёта.
// ---------------------------------------------------------------------------

/** Из URL булевы флаги могут прийти строками 'true'/'false'. */
const toBool = (value: unknown): boolean =>
  value === true || value === 'true' || value === '1';

const toStr = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const buildDefaultValues = (
  pageFilter: BalanceSheetPageFilter,
): BalanceSheetHeaderFormValues => ({
  dateRange: 'custom',
  fromDate: moment(pageFilter.fromDate as string | Date).toDate(),
  toDate: moment(pageFilter.toDate as string | Date).toDate(),
  displayColumnsType: toStr(pageFilter.displayColumnsType, 'total'),
  filterByOption: toStr(pageFilter.filterByOption, 'without-zero-balance'),
  basis: toStr(pageFilter.basis, 'cash'),

  previousYear: toBool(pageFilter.previousYear),
  previousYearAmountChange: toBool(pageFilter.previousYearAmountChange),
  previousYearPercentageChange: toBool(pageFilter.previousYearPercentageChange),

  previousPeriod: toBool(pageFilter.previousPeriod),
  previousPeriodAmountChange: toBool(pageFilter.previousPeriodAmountChange),
  previousPeriodPercentageChange: toBool(
    pageFilter.previousPeriodPercentageChange,
  ),

  percentageOfColumn: toBool(pageFilter.percentageOfColumn),
  percentageOfRow: toBool(pageFilter.percentageOfRow),

  branchesIds: Array.isArray(pageFilter.branchesIds)
    ? (pageFilter.branchesIds as Array<number | string>)
    : [],
});

// ---------------------------------------------------------------------------
// Вкладка «Сравнения».
// ---------------------------------------------------------------------------

/** Булевы поля вкладки «Сравнения» (узкий union для типобезопасного setValue). */
type BalanceSheetBooleanField =
  | 'previousYear'
  | 'previousYearAmountChange'
  | 'previousYearPercentageChange'
  | 'previousPeriod'
  | 'previousPeriodAmountChange'
  | 'previousPeriodPercentageChange'
  | 'percentageOfColumn'
  | 'percentageOfRow';

/**
 * Вкладка «Сравнения»: прошлый год / прошлый период / процентные колонки.
 * Логика зависимых галочек повторяет легаси-хендлеры из utils.tsx.
 */
function BalanceSheetComparisonFields({
  form,
}: {
  form: UseFormReturn<BalanceSheetHeaderFormValues>;
}) {
  const values = form.watch();

  const setValue = (name: BalanceSheetBooleanField, value: boolean) => {
    form.setValue(name, value);
  };

  // Снятие родителя снимает дочерние; включение дочернего включает родителя.
  const handlePreviousYear = (checked: boolean) => {
    setValue('previousYear', checked);
    if (!checked) {
      setValue('previousYearAmountChange', false);
      setValue('previousYearPercentageChange', false);
    }
  };
  const handlePreviousYearAmount = (checked: boolean) => {
    if (checked) setValue('previousYear', true);
    setValue('previousYearAmountChange', checked);
  };
  const handlePreviousYearPercentage = (checked: boolean) => {
    if (checked) setValue('previousYear', true);
    setValue('previousYearPercentageChange', checked);
  };

  const handlePreviousPeriod = (checked: boolean) => {
    setValue('previousPeriod', checked);
    if (!checked) {
      setValue('previousPeriodAmountChange', false);
      setValue('previousPeriodPercentageChange', false);
    }
  };
  const handlePreviousPeriodAmount = (checked: boolean) => {
    if (checked) setValue('previousPeriod', true);
    setValue('previousPeriodAmountChange', checked);
  };
  const handlePreviousPeriodPercentage = (checked: boolean) => {
    if (checked) setValue('previousPeriod', true);
    setValue('previousPeriodPercentageChange', checked);
  };

  return (
    <div className="flex max-w-md flex-col gap-3">
      <ReportCheckboxRow
        label={intl.get('balance_sheet.previous_year')}
        checked={values.previousYear}
        onCheckedChange={handlePreviousYear}
      />
      <div className="flex flex-col gap-2 pl-6 sm:flex-row sm:gap-6">
        <ReportCheckboxRow
          label={intl.get('balance_sheet.total_change')}
          checked={values.previousYearAmountChange}
          onCheckedChange={handlePreviousYearAmount}
        />
        <ReportCheckboxRow
          label={intl.get('balance_sheet.change')}
          checked={values.previousYearPercentageChange}
          onCheckedChange={handlePreviousYearPercentage}
        />
      </div>

      <ReportCheckboxRow
        label={intl.get('balance_sheet.previous_period')}
        checked={values.previousPeriod}
        onCheckedChange={handlePreviousPeriod}
      />
      <div className="flex flex-col gap-2 pl-6 sm:flex-row sm:gap-6">
        <ReportCheckboxRow
          label={intl.get('balance_sheet.total_change')}
          checked={values.previousPeriodAmountChange}
          onCheckedChange={handlePreviousPeriodAmount}
        />
        <ReportCheckboxRow
          label={intl.get('balance_sheet.change')}
          checked={values.previousPeriodPercentageChange}
          onCheckedChange={handlePreviousPeriodPercentage}
        />
      </div>

      <div className="mt-1 flex flex-col gap-2 border-t border-border pt-3">
        <ReportCheckboxRow
          label={intl.get('balance_sheet.percentage_of_column')}
          checked={values.percentageOfColumn}
          onCheckedChange={(checked) => setValue('percentageOfColumn', checked)}
        />
        <ReportCheckboxRow
          label={intl.get('balance_sheet.percentage_of_row')}
          checked={values.percentageOfRow}
          onCheckedChange={(checked) => setValue('percentageOfRow', checked)}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Сама панель настроек баланса.
// ---------------------------------------------------------------------------

/**
 * Панель настроек баланса на общем shadcn-каркасе (FinancialHeaderDrawer +
 * общие поля + RHF/Zod), тираж пилота ОПиУ. Механизм открытия прежний:
 * redux-флаг balanceSheetDrawerFilter через withBalanceSheet(Actions).
 */
function BalanceSheetHeaderV2Root({
  pageFilter,
  onSubmitFilter,
  balanceSheetDrawerFilter,
  toggleBalanceSheetFilterDrawer: toggleFilterDrawer,
}: BalanceSheetHeaderOwnProps & BalanceSheetHeaderReduxProps) {
  const { featureCan } = useFeatureCan();
  const isBranchesFeatureCan = featureCan(Features.Branches);

  const schema = React.useMemo(() => getBalanceSheetHeaderSchema(), []);

  const form = useForm<BalanceSheetHeaderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(pageFilter),
  });

  // При каждом открытии панель подхватывает актуальный query отчёта.
  React.useEffect(() => {
    if (balanceSheetDrawerFilter) {
      form.reset(buildDefaultValues(pageFilter));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balanceSheetDrawerFilter]);

  const handleClose = () => {
    toggleFilterDrawer(false);
  };

  // Как в пилоте ОПиУ: отдаём весь фильтр (numberFormat и прочее — сквозняком).
  const onSubmit = (values: BalanceSheetHeaderFormValues) => {
    onSubmitFilter({ ...pageFilter, ...values });
    toggleFilterDrawer(false);
  };

  return (
    <FinancialHeaderDrawer
      isOpen={Boolean(balanceSheetDrawerFilter)}
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
              <TabsTrigger value="comparison">
                {intl.get('balance_sheet.comparisons')}
              </TabsTrigger>
              {isBranchesFeatureCan ? (
                <TabsTrigger value="dimensions">
                  {intl.get('balance_sheet.dimensions')}
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="general" className="pt-5">
              <div className="flex flex-col gap-4">
                <ReportDateRangeFields />
                <ReportDisplayColumnsByField />
                <ReportFilterOptionField />
              </div>
            </TabsContent>

            <TabsContent value="comparison" className="pt-5">
              <BalanceSheetComparisonFields form={form} />
            </TabsContent>

            {isBranchesFeatureCan ? (
              <TabsContent value="dimensions" className="pt-5">
                <div className="flex flex-col gap-5">
                  <ReportBranchesField />
                  {/* Разрез по юрлицам (этап 7 ТЗ). Поля нет вовсе,
                      пока юрлицо одно: выбор из одного — не выбор. */}
                  <ReportLegalEntitiesField />
                  {/* Разрез по направлениям (остаток О6 ТЗ). Поля нет,
                      пока направление одно: выбор из одного — не выбор. */}
                  <ReportDirectionsField />
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

export const BalanceSheetHeaderV2 = compose(
  withBalanceSheetLoose(({ balanceSheetDrawerFilter }) => ({
    balanceSheetDrawerFilter,
  })),
  withBalanceSheetActionsLoose,
)(BalanceSheetHeaderV2Root) as React.ComponentType<BalanceSheetHeaderOwnProps>;
