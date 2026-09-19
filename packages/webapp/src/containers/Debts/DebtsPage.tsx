// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import { useDebtsOverview, useRepaymentPlans } from '@/hooks/query/debts';
import { DebtsContactRow } from './DebtsContactRow';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { EmptyState } from '@/components/ui/empty-state';
import { ModuleDisabled } from '@/components/ui/module-disabled';

type Side = 'receivable' | 'payable';

const fmt = (n: number) => formatOrganizationMoney(n ?? 0);

const BUCKET_LABELS = [
  'debts.aging.0_30',
  'debts.aging.31_60',
  'debts.aging.61_90',
  'debts.aging.90_plus',
];

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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{intl.get('debts.title')}</h1>
        <div className="flex items-center gap-2">
          {(['receivable', 'payable'] as const).map((s) => (
            <Button
              key={s}
              variant={side === s ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSide(s)}
            >
              {intl.get(`debts.side.${s}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-control border p-3">
          <div className="text-muted-foreground text-sm">
            {intl.get('debts.total')}
          </div>
          <div className="text-lg font-semibold">{fmt(summary?.total ?? 0)}</div>
        </div>
        <div className="rounded-control border p-3">
          <div className="text-muted-foreground text-sm">
            {intl.get('debts.overdue')}
          </div>
          <div className="text-lg font-semibold text-red-600">
            {fmt(summary?.overdueTotal ?? 0)}
          </div>
        </div>
        {overview?.net != null && (
          <div className="rounded-control border p-3">
            <div className="text-muted-foreground text-sm">
              {intl.get('debts.net')}
            </div>
            <div className="text-lg font-semibold">{fmt(overview.net)}</div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {buckets.map((b, i) => (
          <div key={i} className="rounded-control border px-3 py-2 text-sm">
            <div className="text-muted-foreground">
              {intl.get(BUCKET_LABELS[i])}
            </div>
            <div className="font-medium">{fmt(b)}</div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-medium">
        {intl.get(side === 'receivable' ? 'debts.debtors' : 'debts.creditors')}
      </h2>
      <div className="flex flex-col divide-y rounded-control border">
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
          <h2 className="text-lg font-medium">{intl.get('debts.plan.title')}</h2>
          {plansList.map((p) => (
            <div key={p.id} className="rounded-control border p-3 text-sm">
              <div className="flex justify-between">
                <span>{p.description || `#${p.id}`}</span>
                <span className="text-muted-foreground">
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
