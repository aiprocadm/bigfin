import * as React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Features } from '@/constants';
import { useBranches } from '@/hooks/query';
import { useFeatureCan } from '@/hooks/state';
import { compose } from '@/utils';

import {
  FinancialHeaderDrawer,
  FinancialHeaderSkeleton,
  ReportAccountingBasisField,
  ReportDateRangeFields,
  ReportDisplayColumnsByField,
  ReportFilterOptionField,
} from '../../v2';
import { withProfitLoss } from '../withProfitLoss';
import { withProfitLossActions } from '../withProfitLossActions';
import {
  getProfitLossHeaderSchema,
  type ProfitLossHeaderFormValues,
} from './ProfitLossHeader.zod';
import { ReportLegalEntitiesField } from '@/containers/FinancialStatements/v2/FinancialHeaderLegalEntitiesField';
import { ReportDirectionsField } from '@/containers/FinancialStatements/v2/FinancialHeaderDirectionsField';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (redux-HOC и хуки без типов).
// ---------------------------------------------------------------------------

/** Фильтр страницы отчёта (query из URL, форма легаси не меняется). */
type ProfitLossPageFilter = Record<string, unknown>;

interface ProfitLossHeaderOwnProps {
  pageFilter: ProfitLossPageFilter;
  onSubmitFilter: (values: Record<string, unknown>) => void;
}

interface ProfitLossHeaderReduxProps {
  // #withProfitLoss
  profitLossDrawerFilter: boolean;
  // #withProfitLossActions
  toggleProfitLossFilterDrawer: (toggle?: boolean) => void;
}

interface BranchOption {
  id: number | string;
  name: string;
}

const useBranchesTyped = useBranches as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => { data?: BranchOption[]; isLoading: boolean };

const withProfitLossLoose = withProfitLoss as unknown as (
  mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withProfitLossActionsLoose = withProfitLossActions as unknown as (
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
  pageFilter: ProfitLossPageFilter,
): ProfitLossHeaderFormValues => ({
  dateRange: 'custom',
  fromDate: moment(pageFilter.fromDate as string | Date).toDate(),
  toDate: moment(pageFilter.toDate as string | Date).toDate(),
  displayColumnsType: toStr(pageFilter.displayColumnsType, 'total'),
  filterByOption: toStr(pageFilter.filterByOption, 'with-transactions'),
  basis: toStr(pageFilter.basis, 'cash'),

  previousYear: toBool(pageFilter.previousYear),
  previousYearAmountChange: toBool(pageFilter.previousYearAmountChange),
  previousYearPercentageChange: toBool(pageFilter.previousYearPercentageChange),

  previousPeriod: toBool(pageFilter.previousPeriod),
  previousPeriodAmountChange: toBool(pageFilter.previousPeriodAmountChange),
  previousPeriodPercentageChange: toBool(
    pageFilter.previousPeriodPercentageChange,
  ),

  percentageColumn: toBool(pageFilter.percentageColumn),
  percentageRow: toBool(pageFilter.percentageRow),
  percentageExpense: toBool(pageFilter.percentageExpense),
  percentageIncome: toBool(pageFilter.percentageIncome),

  branchesIds: Array.isArray(pageFilter.branchesIds)
    ? (pageFilter.branchesIds as Array<number | string>)
    : [],
});

// ---------------------------------------------------------------------------
// Мелкие блоки формы.
// ---------------------------------------------------------------------------

interface CheckboxRowProps {
  label: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

function CheckboxRow({
  label,
  checked,
  onCheckedChange,
  className,
}: CheckboxRowProps) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 text-sm text-text-primary ${
        className ?? ''
      }`}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      {label}
    </label>
  );
}

/** Булевы поля вкладки «Сравнения» (узкий union для типобезопасного setValue). */
type ProfitLossBooleanField =
  | 'previousYear'
  | 'previousYearAmountChange'
  | 'previousYearPercentageChange'
  | 'previousPeriod'
  | 'previousPeriodAmountChange'
  | 'previousPeriodPercentageChange'
  | 'percentageColumn'
  | 'percentageRow'
  | 'percentageExpense'
  | 'percentageIncome';

/**
 * Вкладка «Сравнения»: прошлый год / прошлый период / процентные колонки.
 * Логика зависимых галочек повторяет легаси-хендлеры из utils.tsx.
 */
function ProfitLossComparisonFields({
  form,
}: {
  form: UseFormReturn<ProfitLossHeaderFormValues>;
}) {
  const values = form.watch();

  const setValue = (name: ProfitLossBooleanField, value: boolean) => {
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
      <CheckboxRow
        label={intl.get('profit_loss_sheet.previous_year')}
        checked={values.previousYear}
        onCheckedChange={handlePreviousYear}
      />
      <div className="flex flex-col gap-2 pl-6 sm:flex-row sm:gap-6">
        <CheckboxRow
          label={intl.get('profit_loss_sheet.total_change')}
          checked={values.previousYearAmountChange}
          onCheckedChange={handlePreviousYearAmount}
        />
        <CheckboxRow
          label={intl.get('profit_loss_sheet.perentage_change')}
          checked={values.previousYearPercentageChange}
          onCheckedChange={handlePreviousYearPercentage}
        />
      </div>

      <CheckboxRow
        label={intl.get('profit_loss_sheet.previous_period')}
        checked={values.previousPeriod}
        onCheckedChange={handlePreviousPeriod}
      />
      <div className="flex flex-col gap-2 pl-6 sm:flex-row sm:gap-6">
        <CheckboxRow
          label={intl.get('profit_loss_sheet.total_change')}
          checked={values.previousPeriodAmountChange}
          onCheckedChange={handlePreviousPeriodAmount}
        />
        <CheckboxRow
          label={intl.get('profit_loss_sheet.perentage_change')}
          checked={values.previousPeriodPercentageChange}
          onCheckedChange={handlePreviousPeriodPercentage}
        />
      </div>

      <div className="mt-1 flex flex-col gap-2 border-t border-border pt-3">
        <CheckboxRow
          label={intl.get('profit_loss_sheet.percentage_of_column')}
          checked={values.percentageColumn}
          onCheckedChange={(checked) => setValue('percentageColumn', checked)}
        />
        <CheckboxRow
          label={intl.get('profit_loss_sheet.percentage_of_row')}
          checked={values.percentageRow}
          onCheckedChange={(checked) => setValue('percentageRow', checked)}
        />
        <CheckboxRow
          label={intl.get('profit_loss_sheet.percentage_of_expense')}
          checked={values.percentageExpense}
          onCheckedChange={(checked) => setValue('percentageExpense', checked)}
        />
        <CheckboxRow
          label={intl.get('profit_loss_sheet.percentage_of_income')}
          checked={values.percentageIncome}
          onCheckedChange={(checked) => setValue('percentageIncome', checked)}
        />
      </div>
    </div>
  );
}

/**
 * Вкладка «Аналитика»: выбор филиалов (мультивыбор галочками).
 * Рендерится только при включённой фиче Branches.
 */
function ProfitLossBranchesFields({
  form,
}: {
  form: UseFormReturn<ProfitLossHeaderFormValues>;
}) {
  const { data: branches, isLoading } = useBranchesTyped(
    {},
    { keepPreviousData: true },
  );
  const selectedIds = form.watch('branchesIds');

  const isSelected = (id: number | string) =>
    selectedIds.some((value) => String(value) === String(id));

  const toggleBranch = (id: number | string) => {
    const next = isSelected(id)
      ? selectedIds.filter((value) => String(value) !== String(id))
      : [...selectedIds, id];

    form.setValue('branchesIds', next);
  };

  if (isLoading) {
    return <FinancialHeaderSkeleton />;
  }
  return (
    <div className="flex max-w-md flex-col gap-2">
      <Label>{intl.get('branches_multi_select.label')}</Label>

      <div className="flex flex-col gap-2">
        {(branches ?? []).map((branch) => (
          <CheckboxRow
            key={String(branch.id)}
            label={branch.name}
            checked={isSelected(branch.id)}
            onCheckedChange={() => toggleBranch(branch.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Сама панель настроек ОПиУ.
// ---------------------------------------------------------------------------

/**
 * Панель настроек ОПиУ на общем shadcn-каркасе (FinancialHeaderDrawer +
 * общие поля + RHF/Zod). Механизм открытия прежний: redux-флаг
 * profitLossDrawerFilter через withProfitLoss/withProfitLossActions.
 */
function ProfitLossHeaderV2Root({
  pageFilter,
  onSubmitFilter,
  profitLossDrawerFilter,
  toggleProfitLossFilterDrawer: toggleFilterDrawer,
}: ProfitLossHeaderOwnProps & ProfitLossHeaderReduxProps) {
  const { featureCan } = useFeatureCan();
  const isBranchesFeatureCan = featureCan(Features.Branches);
  const isAccrualFeatureCan = featureCan(Features.AccrualPnl);

  const schema = React.useMemo(() => getProfitLossHeaderSchema(), []);

  const form = useForm<ProfitLossHeaderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(pageFilter),
  });

  // При каждом открытии панель подхватывает актуальный query отчёта.
  React.useEffect(() => {
    if (profitLossDrawerFilter) {
      form.reset(buildDefaultValues(pageFilter));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profitLossDrawerFilter]);

  const handleClose = () => {
    toggleFilterDrawer(false);
  };

  // Как в легаси: отдаём наверх весь фильтр (numberFormat и прочее — сквозняком).
  const onSubmit = (values: ProfitLossHeaderFormValues) => {
    onSubmitFilter({ ...pageFilter, ...values });
    toggleFilterDrawer(false);
  };

  return (
    <FinancialHeaderDrawer
      isOpen={Boolean(profitLossDrawerFilter)}
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
                {intl.get('profit_loss_sheet.comparisons')}
              </TabsTrigger>
              {isBranchesFeatureCan ? (
                <TabsTrigger value="dimensions">
                  {intl.get('profit_loss_sheet.dimensions')}
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="general" className="pt-5">
              <div className="flex flex-col gap-4">
                <ReportDateRangeFields />
                <ReportDisplayColumnsByField />
                <ReportFilterOptionField />
                {isAccrualFeatureCan ? <ReportAccountingBasisField /> : null}
              </div>
            </TabsContent>

            <TabsContent value="comparison" className="pt-5">
              <ProfitLossComparisonFields form={form} />
            </TabsContent>

            {isBranchesFeatureCan ? (
              <TabsContent value="dimensions" className="pt-5">
                <div className="flex flex-col gap-5">
                  <ProfitLossBranchesFields form={form} />
                  {/* Разрез по юрлицам (этап 7 ТЗ). Поля нет вовсе, пока
                      юрлицо одно: выбор из одного — не выбор. */}
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

export const ProfitLossHeaderV2 = compose(
  withProfitLossLoose(({ profitLossDrawerFilter }) => ({
    profitLossDrawerFilter,
  })),
  withProfitLossActionsLoose,
)(ProfitLossHeaderV2Root) as React.ComponentType<ProfitLossHeaderOwnProps>;
