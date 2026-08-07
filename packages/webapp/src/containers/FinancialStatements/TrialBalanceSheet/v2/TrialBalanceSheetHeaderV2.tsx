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
  ReportFilterOptionField,
} from '../../v2';
import { withTrialBalance } from '../withTrialBalance';
import { withTrialBalanceActions } from '../withTrialBalanceActions';
import {
  getTrialBalanceSheetHeaderSchema,
  type TrialBalanceSheetHeaderFormValues,
} from './TrialBalanceSheetHeader.zod';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (redux-HOC без типов).
// ---------------------------------------------------------------------------

/** Фильтр страницы отчёта (query из URL, форма легаси не меняется). */
type TrialBalanceSheetPageFilter = Record<string, unknown>;

interface TrialBalanceSheetHeaderOwnProps {
  pageFilter: TrialBalanceSheetPageFilter;
  onSubmitFilter: (values: Record<string, unknown>) => void;
}

interface TrialBalanceSheetHeaderReduxProps {
  // #withTrialBalance
  trialBalanceDrawerFilter: boolean;
  // #withTrialBalanceActions
  toggleTrialBalanceFilterDrawer: (toggle?: boolean) => void;
}

const withTrialBalanceLoose = withTrialBalance as unknown as (
  mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withTrialBalanceActionsLoose = withTrialBalanceActions as unknown as (
  component: React.ComponentType<any>,
) => React.ComponentType<any>;

// ---------------------------------------------------------------------------
// Значения формы из query отчёта.
// ---------------------------------------------------------------------------

const toStr = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const buildDefaultValues = (
  pageFilter: TrialBalanceSheetPageFilter,
): TrialBalanceSheetHeaderFormValues => ({
  dateRange: 'custom',
  fromDate: moment(pageFilter.fromDate as string | Date).toDate(),
  toDate: moment(pageFilter.toDate as string | Date).toDate(),
  filterByOption: toStr(pageFilter.filterByOption, 'with-transactions'),
  basis: toStr(pageFilter.basis, 'accrual'),

  branchesIds: Array.isArray(pageFilter.branchesIds)
    ? (pageFilter.branchesIds as Array<number | string>)
    : [],
});

// ---------------------------------------------------------------------------
// Сама панель настроек оборотно-сальдовой ведомости.
// ---------------------------------------------------------------------------

/**
 * Панель настроек оборотно-сальдовой ведомости на общем shadcn-каркасе
 * (FinancialHeaderDrawer + общие поля + RHF/Zod), тираж пилота ОПиУ.
 * Механизм открытия прежний: redux-флаг trialBalanceDrawerFilter
 * через withTrialBalance(Actions).
 */
function TrialBalanceSheetHeaderV2Root({
  pageFilter,
  onSubmitFilter,
  trialBalanceDrawerFilter,
  toggleTrialBalanceFilterDrawer: toggleFilterDrawer,
}: TrialBalanceSheetHeaderOwnProps & TrialBalanceSheetHeaderReduxProps) {
  const { featureCan } = useFeatureCan();
  const isBranchesFeatureCan = featureCan(Features.Branches);

  const schema = React.useMemo(() => getTrialBalanceSheetHeaderSchema(), []);

  const form = useForm<TrialBalanceSheetHeaderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(pageFilter),
  });

  // При каждом открытии панель подхватывает актуальный query отчёта.
  React.useEffect(() => {
    if (trialBalanceDrawerFilter) {
      form.reset(buildDefaultValues(pageFilter));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trialBalanceDrawerFilter]);

  const handleClose = () => {
    toggleFilterDrawer(false);
  };

  // Как в пилоте ОПиУ: отдаём весь фильтр (numberFormat и прочее — сквозняком).
  const onSubmit = (values: TrialBalanceSheetHeaderFormValues) => {
    onSubmitFilter({ ...pageFilter, ...values });
    toggleFilterDrawer(false);
  };

  return (
    <FinancialHeaderDrawer
      isOpen={Boolean(trialBalanceDrawerFilter)}
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
                <ReportFilterOptionField />
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

export const TrialBalanceSheetHeaderV2 = compose(
  withTrialBalanceLoose(({ trialBalanceDrawerFilter }) => ({
    trialBalanceDrawerFilter,
  })),
  withTrialBalanceActionsLoose,
)(
  TrialBalanceSheetHeaderV2Root,
) as React.ComponentType<TrialBalanceSheetHeaderOwnProps>;
