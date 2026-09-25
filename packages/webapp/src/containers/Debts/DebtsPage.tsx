// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useFeatureCan } from '@/hooks/state/feature';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatCard } from '@/components/ui/stat-card';
import { DebtAgingBar } from './DebtAgingBar';
import { useDebtsOverview, useRepaymentPlans } from '@/hooks/query/debts';
import { DebtsContactRow } from './DebtsContactRow';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { EmptyState } from '@/components/ui/empty-state';
import { ModuleDisabled } from '@/components/ui/module-disabled';
import { PageTitle } from '@/components/ui/page-title';

type Side = 'receivable' | 'payable';

const fmt = (n: number) => formatOrganizationMoney(n ?? 0);


export default function DebtsPage() {
  const { featureCan } = useFeatureCan();
  const [side, setSide] = React.useState<Side>('receivable');

  // Обзор запрашиваем целиком, без фильтра стороны: странице нужны обе
  // (переключатель рисуется на клиенте), а «нетто» сервер считает только
  // когда знает и дебиторку, и кредиторку — с фильтром оно не приходило вовсе.
  const { data: overview } = useDebtsOverview({}, {});
  const { data: plans } = useRepaymentPlans({ side }, {});

  if (!featureCan('debts')) return <ModuleDisabled />;

  const summary =
    side === 'receivable' ? overview?.receivable : overview?.payable;
  const buckets: number[] = summary?.buckets ?? [0, 0, 0, 0];
  const contacts: any[] = summary?.contacts ?? [];
  const plansList: any[] = plans ?? [];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>{intl.get('debts.title')}</PageTitle>
        {/* Сторона — сегментами (UI-051-2): выбирается ровно одна. */}
        <SegmentedControl
          aria-label={intl.get('debts.side.aria')}
          value={side}
          onChange={setSide}
          options={(['receivable', 'payable'] as const).map((s) => ({
            value: s,
            label: intl.get(`debts.side.${s}`),
          }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label={intl.get('debts.total')} value={fmt(summary?.total ?? 0)} />
        <StatCard
          label={intl.get('debts.overdue')}
          value={
            <span className={(summary?.overdueTotal ?? 0) > 0 ? 'text-danger' : undefined}>
              {fmt(summary?.overdueTotal ?? 0)}
            </span>
          }
        />
        {overview?.net != null && (
          // «Нетто (деб. − кред.)» — жаргон (O13): словами, что это.
          <StatCard label={intl.get('debts.net_plain')} value={fmt(overview.net)} />
        )}
      </div>

      <DebtAgingBar buckets={buckets} />

      <h2 className="text-headline text-text-primary">
        {intl.get(side === 'receivable' ? 'debts.debtors' : 'debts.creditors')}
      </h2>
      <div className="flex flex-col divide-y divide-border rounded-default border border-border bg-surface">
        {contacts.length === 0 && (
          <EmptyState
            title={intl.get('debts.empty_status.title')}
            description={intl.get('debts.empty_status.description')}
          />
        )}
        {contacts.map((c) => (
          <DebtsContactRow key={c.contactId} contact={c} side={side} />
        ))}
      </div>

      {plansList.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-headline text-text-primary">{intl.get('debts.plan.title')}</h2>
          {plansList.map((p) => (
            <div key={p.id} className="rounded-control border border-border p-3 text-sm">
              <div className="flex justify-between">
                <span>{p.description || `#${p.id}`}</span>
                <span className="text-text-secondary">
                  {intl.get('debts.plan.progress', {
                    percent: Math.round(p.progress?.percentPaid ?? 0),
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
