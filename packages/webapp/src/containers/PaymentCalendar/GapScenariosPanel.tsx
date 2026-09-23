// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import {
  useGapScenarios,
  useReschedulePlannedOperation,
  useWhatIf,
} from '@/hooks/query/paymentCalendar';
import { formatOrganizationMoney } from '@/utils/organizationMoney';

const HORIZON_DAYS = 90;
const day = (value: string) => moment(value).format('DD.MM.YYYY');

/**
 * «Что можно перенести» (FT-051 ТЗ-3) — в карточке разрыва. Плановые
 * выплаты до разрыва, крупные первыми; у каждой — день, с которого разрыва
 * не будет. «Проверить» считает сценарий БЕЗ сохранения, «Перенести»
 * меняет дату плана.
 */
export function GapScenariosPanel() {
  const [open, setOpen] = React.useState(false);
  const { data } = useGapScenarios({ horizonDays: HORIZON_DAYS }, { enabled: open });
  const whatIf = useWhatIf();
  const reschedule = useReschedulePlannedOperation();
  const [verdicts, setVerdicts] = React.useState<Record<number, boolean>>({});

  const candidates: any[] = data?.candidates ?? [];

  const check = async (candidate: any) => {
    const result = await whatIf.mutateAsync({
      horizonDays: HORIZON_DAYS,
      moves: [{ plannedOperationId: candidate.plannedOperationId ?? candidate.planned_operation_id, date: candidate.suggestedDate ?? candidate.suggested_date }],
    });
    setVerdicts((current) => ({ ...current, [candidate.plannedOperationId ?? candidate.planned_operation_id]: (result?.gaps ?? []).length === 0 }));
  };

  const move = async (candidate: any) => {
    try {
      await reschedule.mutateAsync({
        id: candidate.plannedOperationId ?? candidate.planned_operation_id,
        plannedDate: candidate.suggestedDate ?? candidate.suggested_date,
      });
      AppToaster.show({ message: intl.get('payment_calendar.scenarios.moved'), intent: Intent.SUCCESS });
    } catch (error: any) {
      AppToaster.show({
        message: error?.response?.data?.errors?.[0]?.message ?? intl.get('payment_calendar.scenarios.failed'),
        intent: Intent.DANGER,
      });
    }
  };

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {intl.get('payment_calendar.scenarios.open')}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-control border border-border bg-surface p-3 text-sm">
      <span className="font-medium">{intl.get('payment_calendar.scenarios.title')}</span>
      {candidates.length === 0 && <span className="text-text-muted">{intl.get('payment_calendar.scenarios.empty')}</span>}
      {candidates.map((candidate) => {
        const id = candidate.plannedOperationId ?? candidate.planned_operation_id;
        const suggested = candidate.suggestedDate ?? candidate.suggested_date;
        return (
          <div key={id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
            <span>
              {candidate.label} · {day(candidate.date)} · <span className="money">{formatOrganizationMoney(candidate.amount)}</span>
            </span>
            {suggested ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-text-secondary">
                  {intl.get('payment_calendar.scenarios.suggested', { date: day(suggested) })}
                </span>
                {verdicts[id] !== undefined && (
                  <span className={verdicts[id] ? 'text-success' : 'text-danger'}>
                    {intl.get(verdicts[id] ? 'payment_calendar.scenarios.gap_gone' : 'payment_calendar.scenarios.gap_stays')}
                  </span>
                )}
                <Button size="sm" variant="secondary" disabled={whatIf.isLoading} onClick={() => check(candidate)}>
                  {intl.get('payment_calendar.scenarios.check')}
                </Button>
                <Button size="sm" disabled={reschedule.isLoading} onClick={() => move(candidate)}>
                  {intl.get('payment_calendar.scenarios.move')}
                </Button>
              </span>
            ) : (
              <span className="text-text-muted">{intl.get('payment_calendar.scenarios.no_date')}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
