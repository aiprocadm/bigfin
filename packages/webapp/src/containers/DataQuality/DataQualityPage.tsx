// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import { UnmappedTab } from './UnmappedTab';
import { DuplicatesTab } from './DuplicatesTab';
import { PlCashflowTab } from './PlCashflowTab';

type TabKey = 'unmapped' | 'duplicates' | 'pl_cashflow';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'unmapped', label: 'data_quality.tab.unmapped' },
  { key: 'duplicates', label: 'data_quality.tab.duplicates' },
  { key: 'pl_cashflow', label: 'data_quality.tab.pl_cashflow' },
];

const YEARS_BACK = 5;

const selectClassName =
  'border-input bg-background h-9 rounded-md border px-3 text-sm';

export default function DataQualityPage() {
  const { featureCan } = useFeatureCan();
  const [tab, setTab] = React.useState<TabKey>('unmapped');
  const [year, setYear] = React.useState<number>(new Date().getFullYear());

  if (!featureCan('data_quality')) return null;

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
        <h1 className="text-xl font-semibold">
          {intl.get('data_quality.page_title')}
        </h1>
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
    </div>
  );
}
