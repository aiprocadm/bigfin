// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeals, useDealsSummary, useDeleteDeal } from '@/hooks/query/deals';
import { DealDialog } from './DealDialog';
import { DealProfitability } from './DealProfitability';

type StatusFilter = '' | 'in_progress' | 'completed' | 'cancelled';

const fmt = (n: number) => `${(n ?? 0).toLocaleString('ru-RU')} ₽`;
const pct = (n: number) => `${Math.round((n ?? 0) * 100)}%`;

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: '', label: 'deals.filter.all' },
  { key: 'in_progress', label: 'deals.status.in_progress' },
  { key: 'completed', label: 'deals.status.completed' },
  { key: 'cancelled', label: 'deals.status.cancelled' },
];

export default function DealsPage() {
  const { featureCan } = useFeatureCan();
  const [status, setStatus] = React.useState<StatusFilter>('');
  const [editing, setEditing] = React.useState<any | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [openDeal, setOpenDeal] = React.useState<any | null>(null);

  const { data: deals } = useDeals(status ? { status } : {}, {});
  const { data: summary } = useDealsSummary({}, {});
  const del = useDeleteDeal({});

  if (!featureCan('deals')) return null;

  const rows: any[] = deals ?? [];
  const marginById = new Map<number, any>(
    ((summary as any)?.deals ?? []).map((d: any) => [d.id, d]),
  );
  const totals = (summary as any)?.totals ?? { revenue: 0, costs: 0, profit: 0 };
  const top = ((summary as any)?.deals ?? []).slice(0, 3);

  const onDelete = async (id: number) => {
    try {
      await del.mutateAsync(id);
      toast.success(intl.get('deals.deleted_ok'));
    } catch {
      toast.error(intl.get('deals.delete_error'));
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{intl.get('deals.page_title')}</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          {intl.get('deals.create')}
        </Button>
      </div>

      {/* Дашборд */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {intl.get('deals.dashboard.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm">
          <div>
            {intl.get('deals.dashboard.profit')}:{' '}
            <span className="font-medium">{fmt(totals.profit)}</span>
          </div>
          <div>
            {intl.get('deals.dashboard.revenue')}:{' '}
            <span className="font-medium">{fmt(totals.revenue)}</span>
          </div>
          <div className="text-muted-foreground">
            {intl.get('deals.dashboard.top_by_profit')}:{' '}
            {top.map((d: any) => d.name).join(' · ') || '—'}
          </div>
        </CardContent>
      </Card>

      {/* Табы статуса */}
      <div className="flex flex-wrap items-center gap-1">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.key || 'all'}
            variant={status === tab.key ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setStatus(tab.key)}
          >
            {intl.get(tab.label)}
          </Button>
        ))}
      </div>

      {/* Список */}
      <div className="flex flex-col divide-y rounded-md border">
        {rows.length === 0 && (
          <div className="text-muted-foreground p-4 text-sm">
            {intl.get('deals.empty')}
          </div>
        )}
        {rows.map((d) => {
          const m = marginById.get(d.id);
          return (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <button
                className="flex flex-col text-left"
                onClick={() => setOpenDeal(d)}
              >
                <span className="font-medium">{d.name}</span>
                <span className="text-muted-foreground">
                  {intl.get(`deals.status.${d.status}`)}
                  {d.deadline ? ` · ${d.deadline}` : ''}
                </span>
              </button>
              <div className="flex items-center gap-4">
                {m && (
                  <span className="text-muted-foreground">
                    {fmt(m.profit)} · {pct(m.margin)}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(d);
                    setShowForm(true);
                  }}
                >
                  {intl.get('deals.action.edit')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(d.id)}>
                  {intl.get('deals.action.delete')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {openDeal && (
        <div className="mt-2">
          <DealProfitability deal={openDeal} />
          <div className="mt-2">
            <Button variant="ghost" size="sm" onClick={() => setOpenDeal(null)}>
              {intl.get('deals.close')}
            </Button>
          </div>
        </div>
      )}

      {showForm && (
        <DealDialog
          deal={editing}
          onDone={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
