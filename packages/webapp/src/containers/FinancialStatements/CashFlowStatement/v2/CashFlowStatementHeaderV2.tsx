import * as React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Features } from '@/constants';
import { useFeatureCan } from '@/hooks/state';
import { compose } from '@/utils';

import {
  FinancialHeaderDrawer,
  ReportBranchesField,
  ReportDateRangeFields,
  ReportDisplayColumnsByField,
  ReportFilterOptionField,
} from '../../v2';
import { withCashFlowStatement } from '../withCashFlowStatement';
import { withCashFlowStatementActions } from '../withCashFlowStatementActions';
import {
  getCashFlowStatementHeaderSchema,
  type CashFlowStatementHeaderFormValues,
} from './CashFlowStatementHeader.zod';
import { ReportLegalEntitiesField } from '@/containers/FinancialStatements/v2/FinancialHeaderLegalEntitiesField';
import { ReportDirectionsField } from '@/containers/FinancialStatements/v2/FinancialHeaderDirectionsField';
import { ReportPreviousPeriodFields } from '@/containers/FinancialStatements/v2/FinancialHeaderPreviousPeriodFields';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (redux-HOC без типов).
// ---------------------------------------------------------------------------

/** Фильтр страницы отчёта (query из URL, форма легаси не меняется). */
type CashFlowStatementPageFilter = Record<string, unknown>;

interface CashFlowStatementHeaderOwnProps {
  pageFilter: CashFlowStatementPageFilter;
  onSubmitFilter: (values: Record<string, unknown>) => void;
}

interface CashFlowStatementHeaderReduxProps {
  // #withCashFlowStatement
  cashFlowStatementDrawerFilter: boolean;
  // #withCashFlowStatementActions
  toggleCashFlowStatementFilterDrawer: (toggle?: boolean) => void;
}

const withCashFlowStatementLoose = withCashFlowStatement as unknown as (
  mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withCashFlowStatementActionsLoose =
  withCashFlowStatementActions as unknown as (
    component: React.ComponentType<any>,
  ) => React.ComponentType<any>;

// ---------------------------------------------------------------------------
// Значения формы из query отчёта.
// ---------------------------------------------------------------------------

const toStr = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const buildDefaultValues = (
  pageFilter: CashFlowStatementPageFilter,
): CashFlowStatementHeaderFormValues => ({
  dateRange: 'custom',
  fromDate: moment(pageFilter.fromDate as string | Date).toDate(),
  toDate: moment(pageFilter.toDate as string | Date).toDate(),
  displayColumnsType: toStr(pageFilter.displayColumnsType, 'total'),
  filterByOption: toStr(pageFilter.filterByOption, 'with-transactions'),
  basis: toStr(pageFilter.basis, 'cash'),

  // Сравнение выключено по умолчанию: лишние колонки на узком экране
  // прячут сами числа.
  previousPeriod: Boolean(pageFilter.previousPeriod),
  previousPeriodAmountChange: Boolean(pageFilter.previousPeriodAmountChange),
  previousPeriodPercentageChange: Boolean(
    pageFilter.previousPeriodPercentageChange,
  ),

  branchesIds: Array.isArray(pageFilter.branchesIds)
    ? (pageFilter.branchesIds as Array<number | string>)
    : [],
});

// ---------------------------------------------------------------------------
// Сама панель настроек отчёта о движении денег.
// ---------------------------------------------------------------------------

/**
 * Панель настроек отчёта о движении денег на общем shadcn-каркасе
 * (FinancialHeaderDrawer + общие поля + RHF/Zod), тираж пилота ОПиУ.
 * Механизм открытия прежний: redux-флаг cashFlowStatementDrawerFilter
 * через withCashFlowStatement(Actions).
 */
function CashFlowStatementHeaderV2Root({
  pageFilter,
  onSubmitFilter,
  cashFlowStatementDrawerFilter,
  toggleCashFlowStatementFilterDrawer: toggleFilterDrawer,
}: CashFlowStatementHeaderOwnProps & CashFlowStatementHeaderReduxProps) {
  const { featureCan } = useFeatureCan();
  const isBranchesFeatureCan = featureCan(Features.Branches);

  const schema = React.useMemo(() => getCashFlowStatementHeaderSchema(), []);

  const form = useForm<CashFlowStatementHeaderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(pageFilter),
  });

  // При каждом открытии панель подхватывает актуальный query отчёта.
  React.useEffect(() => {
    if (cashFlowStatementDrawerFilter) {
      form.reset(buildDefaultValues(pageFilter));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashFlowStatementDrawerFilter]);

  const handleClose = () => {
    toggleFilterDrawer(false);
  };

  // Как в пилоте ОПиУ: отдаём весь фильтр (numberFormat и прочее — сквозняком).
  const onSubmit = (values: CashFlowStatementHeaderFormValues) => {
    onSubmitFilter({ ...pageFilter, ...values });
    toggleFilterDrawer(false);
  };

  return (
    <FinancialHeaderDrawer
      isOpen={Boolean(cashFlowStatementDrawerFilter)}
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
                <ReportDateRangeFields />
                <ReportDisplayColumnsByField />
                <ReportFilterOptionField />
                {/* Сравнение с прошлым периодом (остаток О3 ТЗ): ДДС был
                    единственным из трёх главных отчётов без него. */}
                <ReportPreviousPeriodFields />
              </div>
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

export const CashFlowStatementHeaderV2 = compose(
  withCashFlowStatementLoose(({ cashFlowStatementDrawerFilter }) => ({
    cashFlowStatementDrawerFilter,
  })),
  withCashFlowStatementActionsLoose,
)(
  CashFlowStatementHeaderV2Root,
) as React.ComponentType<CashFlowStatementHeaderOwnProps>;
