// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { useFeatureCan } from '@/hooks/state/feature';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDealStages, useDeleteStage } from '@/hooks/query/dealStages';
import { DealStageDialog } from './DealStageDialog';

const fmt = (n: number) => `${(n ?? 0).toLocaleString('ru-RU')} ₽`;
const pct = (n: number) => `${Math.round((n ?? 0) * 100)}%`;

export function DealStagesSection({ dealId }: { dealId: number | string }) {
  const { featureCan } = useFeatureCan();
  const [editing, setEditing] = React.useState<any | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [defaultStatus, setDefaultStatus] = React.useState<'open' | 'closed'>('open');

  const { data } = useDealStages(dealId, {}, {
    enabled: !!dealId && featureCan('deal_stages'),
  });
  const del = useDeleteStage(dealId, {});

  if (!featureCan('deal_stages')) return null;

  const stages: any[] = (data as any)?.stages ?? [];
  const summary = (data as any)?.summary ?? {
    planned: { revenue: 0, costs: 0, profit: 0 },
    recognized: { revenue: 0, costs: 0, profit: 0 },
    progress: 0,
    fact: { revenue: 0, costs: 0, profit: 0 },
  };

  const onDelete = async (stageId: number) => {
    try {
      await del.mutateAsync(stageId);
      toast.success(intl.get('deal_stages.deleted_ok'));
    } catch {
      toast.error(intl.get('deal_stages.delete_error'));
    }
  };

  const openAdd = () => { setEditing(null); setDefaultStatus('open'); setShowForm(true); };
  const openEdit = (s: any) => { setEditing(s); setDefaultStatus(s.status); setShowForm(true); };
  const openClose = (s: any) => { setEditing(s); setDefaultStatus('closed'); setShowForm(true); };

  return (
    <Card className="mt-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{intl.get('deal_stages.section.title')}</CardTitle>
        <Button size="sm" onClick={openAdd}>{intl.get('deal_stages.action.add')}</Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between">
          <span>{intl.get('deal_stages.progress')}</span>
          <span className="font-medium">{pct(summary.progress)}</span>
        </div>
        <div className="text-muted-foreground flex justify-between">
          <span>{intl.get('deal_stages.recognized')}</span>
          <span>{fmt(summary.recognized.profit)}</span>
        </div>
        <div className="text-muted-foreground flex justify-between">
          <span>{intl.get('deal_stages.plan')} / {intl.get('deal_stages.fact')}</span>
          <span>{fmt(summary.planned.profit)} / {fmt(summary.fact.profit)}</span>
        </div>

        <div className="flex flex-col divide-y rounded-md border">
          {stages.length === 0 && (
            <div className="text-muted-foreground p-3">{intl.get('deal_stages.empty')}</div>
          )}
          {stages.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="flex flex-col">
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground">
                  {intl.get(`deal_stages.status.${s.status}`)}
                  {s.closedDate ? ` · ${s.closedDate}` : ''} · {fmt(s.plannedRevenue)} → {fmt(s.plannedCost)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {s.status !== 'closed' && (
                  <Button size="sm" variant="ghost" onClick={() => openClose(s)}>
                    {intl.get('deal_stages.action.close')}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                  {intl.get('deal_stages.action.edit')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(s.id)}>
                  {intl.get('deal_stages.action.delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {showForm && (
          <DealStageDialog
            dealId={dealId}
            stage={editing}
            defaultStatus={defaultStatus}
            onDone={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}
