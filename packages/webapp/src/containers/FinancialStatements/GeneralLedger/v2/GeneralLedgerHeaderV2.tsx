import * as React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Features } from '@/constants';
import { useAccounts } from '@/hooks/query';
import { useFeatureCan } from '@/hooks/state';
import { compose } from '@/utils';

import {
  FinancialHeaderDrawer,
  FinancialHeaderSkeleton,
  ReportBranchesField,
  ReportDateRangeFields,
  ReportEntitiesField,
  ReportFilterOptionField,
  type ReportFilterOption,
} from '../../v2';
import { filterAccountsOptions } from '../common';
import { withGeneralLedger } from '../withGeneralLedger';
import { withGeneralLedgerActions } from '../withGeneralLedgerActions';
import {
  getGeneralLedgerHeaderSchema,
  type GeneralLedgerHeaderFormValues,
} from './GeneralLedgerHeader.zod';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (redux-HOC и хуки без типов).
// ---------------------------------------------------------------------------

/** Фильтр страницы отчёта (query из URL, форма легаси не меняется). */
type GeneralLedgerPageFilter = Record<string, unknown>;

interface GeneralLedgerHeaderOwnProps {
  pageFilter: GeneralLedgerPageFilter;
  onSubmitFilter: (values: Record<string, unknown>) => void;
}

interface GeneralLedgerHeaderReduxProps {
  // #withGeneralLedger
  isFilterDrawerOpen: boolean;
  // #withGeneralLedgerActions
  toggleGeneralLedgerFilterDrawer: (toggle?: boolean) => void;
}

interface AccountOption {
  id: number | string;
  name: string;
}

const useAccountsTyped = useAccounts as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => { data?: AccountOption[]; isLoading: boolean };

const withGeneralLedgerLoose = withGeneralLedger as unknown as (
  mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withGeneralLedgerActionsLoose = withGeneralLedgerActions as unknown as (
  component: React.ComponentType<any>,
) => React.ComponentType<any>;

/** Опции фильтра счетов Главной книги (легаси-модуль common без типов). */
const glFilterAccountsOptions = filterAccountsOptions as ReportFilterOption[];

// ---------------------------------------------------------------------------
// Значения формы из query отчёта.
// ---------------------------------------------------------------------------

const toStr = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const toIds = (value: unknown): Array<number | string> =>
  Array.isArray(value) ? (value as Array<number | string>) : [];

const buildDefaultValues = (
  pageFilter: GeneralLedgerPageFilter,
): GeneralLedgerHeaderFormValues => ({
  dateRange: 'custom',
  fromDate: moment(pageFilter.fromDate as string | Date).toDate(),
  toDate: moment(pageFilter.toDate as string | Date).toDate(),
  filterByOption: toStr(pageFilter.filterByOption, 'with-transactions'),
  basis: toStr(pageFilter.basis, 'accrual'),
  accountsIds: toIds(pageFilter.accountsIds),
  branchesIds: toIds(pageFilter.branchesIds),
});

// ---------------------------------------------------------------------------
// Мелкие блоки формы.
// ---------------------------------------------------------------------------

/** Выбор определённых счетов (замена легаси AccountsMultiSelect). */
function GeneralLedgerAccountsField() {
  const { data: accounts, isLoading } = useAccountsTyped(
    {},
    { keepPreviousData: true },
  );

  if (isLoading) {
    return <FinancialHeaderSkeleton />;
  }
  return (
    <ReportEntitiesField
      name="accountsIds"
      label={intl.get('specific_accounts')}
      items={(accounts ?? []).map((account) => ({
        id: account.id,
        name: account.name,
      }))}
    />
  );
}

// ---------------------------------------------------------------------------
// Сама панель настроек Главной книги.
// ---------------------------------------------------------------------------

/**
 * Панель настроек Главной книги на общем shadcn-каркасе (FinancialHeaderDrawer
 * + общие поля + RHF/Zod). Механизм открытия прежний: redux-флаг
 * generalLedgerFilterDrawer через withGeneralLedger/withGeneralLedgerActions.
 */
function GeneralLedgerHeaderV2Root({
  pageFilter,
  onSubmitFilter,
  isFilterDrawerOpen,
  toggleGeneralLedgerFilterDrawer: toggleFilterDrawer,
}: GeneralLedgerHeaderOwnProps & GeneralLedgerHeaderReduxProps) {
  const { featureCan } = useFeatureCan();
  const isBranchesFeatureCan = featureCan(Features.Branches);

  const schema = React.useMemo(() => getGeneralLedgerHeaderSchema(), []);

  const form = useForm<GeneralLedgerHeaderFormValues>({
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

  // Как в легаси: отдаём наверх весь фильтр (лишние query-параметры — сквозняком).
  const onSubmit = (values: GeneralLedgerHeaderFormValues) => {
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
                <ReportDateRangeFields />
                <ReportFilterOptionField items={glFilterAccountsOptions} />
                <GeneralLedgerAccountsField />
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

export const GeneralLedgerHeaderV2 = compose(
  withGeneralLedgerLoose(({ generalLedgerFilterDrawer }) => ({
    isFilterDrawerOpen: generalLedgerFilterDrawer,
  })),
  withGeneralLedgerActionsLoose,
)(GeneralLedgerHeaderV2Root) as React.ComponentType<GeneralLedgerHeaderOwnProps>;
