// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { useFeatureCan } from '@/hooks/state/feature';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDealStages, useDeleteStage } from '@/hooks/query/dealStages';
import { DealStageDialog } from './DealStageDialog';
import { formatShortDate } from '@/utils/formatShortDate';
import { formatOrganizationMoney } from '@/utils/organizationMoney';

const fmt = (n: number) => formatOrganizationMoney(n ?? 0);
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

  // «Факт 0 ₽» чаще означает не «сработали в ноль», а «к сделке не привязана
  // ни одна операция» — молчаливый ноль вводил в заблуждение.
  const factIsEmpty =
    !summary.fact?.revenue && !summary.fact?.costs && !summary.fact?.profit;

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
        {/* Три строки сводки считались по-разному (прогресс — по выручке,
            остальное — по прибыли), но подписи об этом молчали: «Прогресс 30 %»
            рядом с «Признано 60 000 ₽» не сходились у пользователя в голове.
            Теперь у каждого числа написано, выручка это или прибыль. */}
        <div className="flex items-center justify-between">
          <span>{intl.get('deal_stages.progress_by_revenue')}</span>
          <span className="font-medium">{pct(summary.progress)}</span>
        </div>
        <div className="text-muted-foreground flex justify-between">
          <span>{intl.get('deal_stages.recognized')}</span>
          <span>
            {intl.get('deal_stages.metric.revenue')} {fmt(summary.recognized.revenue)}
            {' · '}
            {intl.get('deal_stages.metric.profit')} {fmt(summary.recognized.profit)}
          </span>
        </div>
        <div className="text-muted-foreground flex justify-between">
          <span>{intl.get('deal_stages.plan_fact_profit')}</span>
          <span>
            {fmt(summary.planned.profit)} /{' '}
            {factIsEmpty
              ? intl.get('deal_stages.fact_no_operations')
              : fmt(summary.fact.profit)}
          </span>
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
                  {s.closedDate ? ` · ${formatShortDate(s.closedDate)}` : ''}
                  {' · '}
                  {/* Раньше здесь была стрелка «150 000 ₽ → 90 000 ₽», и её
                      читали как «план → факт», хотя это выручка и расходы. */}
                  {intl.get('deal_stages.field.planned_revenue')}: {fmt(s.plannedRevenue)}
                  {' · '}
                  {intl.get('deal_stages.field.planned_cost')}: {fmt(s.plannedCost)}
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
          // key по этапу: форма живёт рядом со списком и не блокирует его,
          // поэтому переключение «Изменить»/«Закрыть этап» на другой этап
          // обязано пересоздать форму. Без этого React переиспользовал узлы,
          // в полях оставались суммы прежнего этапа — и сохранение записывало
          // их в другой этап (приёмка ㉘ воспроизвела вживую).
          <DealStageDialog
            key={editing?.id ?? 'new'}
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
