import * as React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { compose } from '@/utils';

import { FinancialHeaderDrawer, ReportDateRangeFields } from '../../v2';
import { withJournal } from '../withJournal';
import { withJournalActions } from '../withJournalActions';
import {
  getJournalHeaderSchema,
  type JournalHeaderFormValues,
} from './JournalHeader.zod';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (redux-HOC без типов).
// ---------------------------------------------------------------------------

/** Фильтр страницы отчёта (query из URL, форма легаси не меняется). */
type JournalPageFilter = Record<string, unknown>;

interface JournalHeaderOwnProps {
  pageFilter: JournalPageFilter;
  onSubmitFilter: (values: Record<string, unknown>) => void;
}

interface JournalHeaderReduxProps {
  // #withJournal
  journalSheetDrawerFilter: boolean;
  // #withJournalActions
  toggleJournalSheetFilter: (toggle?: boolean) => void;
}

const withJournalLoose = withJournal as unknown as (
  mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withJournalActionsLoose = withJournalActions as unknown as (
  component: React.ComponentType<any>,
) => React.ComponentType<any>;

// ---------------------------------------------------------------------------
// Значения формы из query отчёта.
// ---------------------------------------------------------------------------

const buildDefaultValues = (
  pageFilter: JournalPageFilter,
): JournalHeaderFormValues => ({
  dateRange: 'custom',
  fromDate: moment(pageFilter.fromDate as string | Date).toDate(),
  toDate: moment(pageFilter.toDate as string | Date).toDate(),
});

/**
 * Панель настроек журнала проводок на общем shadcn-каркасе
 * (FinancialHeaderDrawer + общие поля + RHF/Zod). Единственная секция —
 * период отчёта, вкладки не нужны. Механизм открытия прежний: redux-флаг
 * journalSheetDrawerFilter через withJournal/withJournalActions.
 */
function JournalHeaderV2Root({
  pageFilter,
  onSubmitFilter,
  journalSheetDrawerFilter,
  toggleJournalSheetFilter: toggleFilterDrawer,
}: JournalHeaderOwnProps & JournalHeaderReduxProps) {
  const schema = React.useMemo(() => getJournalHeaderSchema(), []);

  const form = useForm<JournalHeaderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(pageFilter),
  });

  // При каждом открытии панель подхватывает актуальный query отчёта.
  React.useEffect(() => {
    if (journalSheetDrawerFilter) {
      form.reset(buildDefaultValues(pageFilter));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journalSheetDrawerFilter]);

  const handleClose = () => {
    toggleFilterDrawer(false);
  };

  // Как в легаси: отдаём наверх весь фильтр (basis и прочее — сквозняком).
  const onSubmit = (values: JournalHeaderFormValues) => {
    onSubmitFilter({ ...pageFilter, ...values });
    toggleFilterDrawer(false);
  };

  return (
    <FinancialHeaderDrawer
      isOpen={Boolean(journalSheetDrawerFilter)}
      onClose={handleClose}
      title={intl.get('customize_report')}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          <ReportDateRangeFields />

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

export const JournalHeaderV2 = compose(
  withJournalLoose(({ journalSheetDrawerFilter }) => ({
    journalSheetDrawerFilter,
  })),
  withJournalActionsLoose,
)(JournalHeaderV2Root) as React.ComponentType<JournalHeaderOwnProps>;
