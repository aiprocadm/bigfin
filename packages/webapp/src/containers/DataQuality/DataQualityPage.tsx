// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import { UnmappedTab } from './UnmappedTab';
import { DuplicatesTab } from './DuplicatesTab';
import { PlCashflowTab } from './PlCashflowTab';
import { UnbalancedTab } from './UnbalancedTab';
import { CrookedCurrencyTab } from './CrookedCurrencyTab';
import { FailedMailsTab } from './FailedMailsTab';
import { DriftedBalancesTab } from './DriftedBalancesTab';
import { AccrualShiftsTab } from './AccrualShiftsTab';
import { ModuleDisabled } from '@/components/ui/module-disabled';
import { PageTitle } from '@/components/ui/page-title';

type TabKey =
  | 'unmapped'
  | 'duplicates'
  | 'pl_cashflow'
  | 'accrual_shifts'
  | 'unbalanced'
  | 'crooked_currency'
  | 'drifted_balances'
  | 'failed_mails';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'unmapped', label: 'data_quality.tab.unmapped' },
  { key: 'duplicates', label: 'data_quality.tab.duplicates' },
  { key: 'pl_cashflow', label: 'data_quality.tab.pl_cashflow' },
  { key: 'accrual_shifts', label: 'data_quality.tab.accrual_shifts' },
  { key: 'unbalanced', label: 'data_quality.tab.unbalanced' },
  { key: 'crooked_currency', label: 'data_quality.tab.crooked_currency' },
  { key: 'drifted_balances', label: 'data_quality.tab.drifted_balances' },
  { key: 'failed_mails', label: 'data_quality.tab.failed_mails' },
];

const YEARS_BACK = 5;

const selectClassName =
  'border-input bg-background h-9 rounded-control border px-3 text-sm';

export default function DataQualityPage() {
  const { featureCan } = useFeatureCan();
  const [tab, setTab] = React.useState<TabKey>('unmapped');
  const [year, setYear] = React.useState<number>(new Date().getFullYear());

  if (!featureCan('data_quality')) return <ModuleDisabled />;

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: YEARS_BACK + 1 },
    (_, i) => currentYear - i,
  );

  const fromDate = `${year}-01-01`;
  const toDate = `${year}-12-31`;

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageTitle>
          {intl.get('data_quality.page_title')}
        </PageTitle>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {intl.get('data_quality.year')}
          </span>
          <select
            className={selectClassName}
            value={String(year)}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1">
        {TABS.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setTab(t.key)}
          >
            {intl.get(t.label)}
          </Button>
        ))}
      </div>

      {tab === 'unmapped' && (
        <UnmappedTab fromDate={fromDate} toDate={toDate} />
      )}
      {tab === 'duplicates' && (
        <DuplicatesTab fromDate={fromDate} toDate={toDate} />
      )}
      {tab === 'pl_cashflow' && (
        <PlCashflowTab fromDate={fromDate} toDate={toDate} />
      )}
      {tab === 'accrual_shifts' && (
        <AccrualShiftsTab fromDate={fromDate} toDate={toDate} />
      )}
      {tab === 'unbalanced' && (
        <UnbalancedTab fromDate={fromDate} toDate={toDate} />
      )}
      {tab === 'crooked_currency' && (
        <CrookedCurrencyTab fromDate={fromDate} toDate={toDate} />
      )}
      {/* Остаток счёта сравнивается со ВСЕМИ проводками, а не за год:
          колонка хранит текущее состояние, у него периода нет. */}
      {tab === 'drifted_balances' && <DriftedBalancesTab />}

      {/* Сводка всегда за 7 дней — годовой фильтр к ней не относится. */}
      {tab === 'failed_mails' && <FailedMailsTab />}
    </div>
  );
}
