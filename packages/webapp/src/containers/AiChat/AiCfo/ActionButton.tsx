// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AbilitySubject, CashflowAction } from '@/constants/abilityOption';
import { useAbilityContext } from '@/hooks/utils';
import type { AiCfoAction } from '@/hooks/query/aiCfo';
import { useReschedulePlannedOperation, useWhatIf } from '@/hooks/query/paymentCalendar';
import { showApiError } from '@/utils/showApiError';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { actionConfirmValues, actionPlannedDate, gapFromWhatIf } from './aiCfoHelpers';
import { formatAiCfoDate } from './aiCfoFormat';

type Gap = { date: string; amount: number } | null;

export interface ActionButtonProps {
  action: AiCfoAction;
}

/**
 * Предложенное действие AI CFO (FT-102, правило 4: «AI ничего не меняет»).
 *
 * Порядок жёсткий, и каждый шаг делает ЧЕЛОВЕК:
 *   1. «Проверить перенос» — прогноз ДО и ПОСЛЕ, ничего не сохраняется;
 *   2. «Перенести» — появляется только после проверки;
 *   3. окно подтверждения с суммой и датами — и только его кнопка меняет
 *      платёжный календарь, обычной ручкой продукта с правами человека.
 * Сам ответ AI не вызывает ничего: ни проверку, ни перенос.
 */
export function ActionButton({ action }: ActionButtonProps) {
  const ability = useAbilityContext();
  // Проверка — чтение календаря, перенос — изменение: права разные, и
  // кнопку, которую сервер всё равно отклонит, показывать незачем.
  const canPreview = ability.can(CashflowAction.View, AbilitySubject.Cashflow);
  const canExecute = ability.can(CashflowAction.Create, AbilitySubject.Cashflow);

  const whatIf = useWhatIf();
  const reschedule = useReschedulePlannedOperation();

  const [preview, setPreview] = React.useState<{ before: Gap; after: Gap } | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const fmt = { money: formatOrganizationMoney, date: formatAiCfoDate };

  const gapText = (gap: Gap) =>
    gap
      ? intl.get('ai_cfo.action.gap', {
          date: formatAiCfoDate(gap.date),
          amount: formatOrganizationMoney(gap.amount),
        })
      : intl.get('ai_cfo.action.no_gap');

  const check = async () => {
    try {
      // «До» — тот же прогноз без переносов: так обе цифры посчитаны одной
      // ручкой на одном горизонте и честно сравнимы между собой.
      const [before, after] = await Promise.all([
        whatIf.mutateAsync({ ...(action.preview.body as any), moves: [] }),
        whatIf.mutateAsync(action.preview.body as any),
      ]);
      setPreview({ before: gapFromWhatIf(before), after: gapFromWhatIf(after) });
    } catch (error) {
      showApiError(error);
    }
  };

  const execute = async () => {
    try {
      await reschedule.mutateAsync({
        id: Number(action.plannedOperationId),
        plannedDate: actionPlannedDate(action),
      });
      // Хук переноса сам обновляет прогноз и списки плана — календарь
      // покажет новую дату сразу, без перезагрузки.
      AppToaster.show({ message: intl.get('ai_cfo.action.moved'), intent: Intent.SUCCESS });
      setDone(true);
    } catch (error) {
      showApiError(error, {}, 'ai_cfo.action.failed');
    } finally {
      setConfirmOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-control border border-border bg-surface-elevated p-3 text-sm">
      <span className="font-medium text-text-primary">{action.label}</span>

      {preview && (
        <div className="flex flex-col gap-0.5 text-text-secondary">
          <span>{intl.get('ai_cfo.action.before', { text: gapText(preview.before) })}</span>
          <span className={preview.after ? 'text-danger' : 'text-success'}>
            {intl.get('ai_cfo.action.after', { text: gapText(preview.after) })}
          </span>
        </div>
      )}

      {done ? (
        <span className="text-success">{intl.get('ai_cfo.action.done')}</span>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {canPreview && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={whatIf.isLoading}
              onClick={check}
            >
              {intl.get('ai_cfo.action.check')}
            </Button>
          )}
          {preview && canExecute && (
            <Button
              type="button"
              size="sm"
              disabled={reschedule.isLoading}
              onClick={() => setConfirmOpen(true)}
            >
              {intl.get('ai_cfo.action.move')}
            </Button>
          )}
          {preview && !canExecute && (
            <span className="text-xs text-text-muted">{intl.get('ai_cfo.action.no_right')}</span>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={intl.get('ai_cfo.action.confirm_title')}
        description={intl.get('ai_cfo.action.confirm_text', actionConfirmValues(action, fmt))}
        confirmLabel={intl.get('ai_cfo.action.move')}
        loading={reschedule.isLoading}
        onConfirm={execute}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

export default ActionButton;
