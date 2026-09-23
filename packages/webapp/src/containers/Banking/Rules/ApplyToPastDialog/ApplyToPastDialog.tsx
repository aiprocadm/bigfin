// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { Button, Checkbox, Classes, Intent } from '@blueprintjs/core';

import { AppToaster, Dialog, DialogSuspense } from '@/components';
import withDialogRedux, { DialogReduxProps } from '@/components/DialogReduxConnect';
import { withDialogActions, WithDialogActionsProps } from '@/containers/Dialog/withDialogActions';
import { DialogsName } from '@/constants/dialogs';
import { useApplyBankRuleToPast, useBankRulePreview } from '@/hooks/query/bank-rules';
import { compose, formattedAmount } from '@/utils';
import { showApiError } from '@/utils/showApiError';

interface PreviewItem {
  id: number;
  date: string;
  amount: number;
  currencyCode?: string;
  currency_code?: string;
  description?: string;
  payee?: string;
}

const formatDate = (value: string) => {
  const locale = intl.getInitOptions?.()?.currentLocale || 'ru';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale).format(date);
};

/**
 * «Применить к прошлым операциям?» (FT-034 ТЗ-3).
 *
 * Список ровно тех неразнесённых строк, что подходят под правило; все
 * отмечены, лишнее можно снять. Разноска идёт в фоне — окно закрывается
 * сразу, итог приходит уведомлением.
 */
function ApplyToPastContentRoot({
  ruleId,
  closeDialog,
}: { ruleId: number } & WithDialogActionsProps) {
  const { data, isLoading } = useBankRulePreview(ruleId);
  const { mutateAsync: apply, isLoading: isApplying } = useApplyBankRuleToPast();
  const ids: number[] = data?.ids ?? [];
  const items: PreviewItem[] = data?.items ?? [];
  const [excluded, setExcluded] = React.useState<Set<number>>(new Set());

  const selected = ids.filter((id) => !excluded.has(id));
  const hidden = Math.max(0, ids.length - items.length);
  const close = () => closeDialog(DialogsName.BankRuleApplyToPast);

  const toggle = (id: number) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleApply = async () => {
    try {
      const result = await apply({ ruleId, ids: selected });
      AppToaster.show({
        intent: Intent.SUCCESS,
        message: intl.get('banking.rules.apply_past.queued', { count: result?.queued ?? selected.length }),
      });
      close();
    } catch (error) {
      showApiError(error);
    }
  };

  if (isLoading) {
    return <div className={Classes.DIALOG_BODY}>{intl.get('alert_content_is_loading')}</div>;
  }

  return (
    <>
      <div className={Classes.DIALOG_BODY}>
        {ids.length === 0 ? (
          <p>{intl.get('banking.rules.apply_past.nothing')}</p>
        ) : (
          <>
            <p>{intl.get('banking.rules.apply_past.intro', { total: ids.length })}</p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
              <Button minimal small onClick={() => setExcluded(new Set())}>
                {intl.get('banking.rules.apply_past.select_all')}
              </Button>
              <Button minimal small onClick={() => setExcluded(new Set(ids))}>
                {intl.get('banking.rules.apply_past.select_none')}
              </Button>
            </div>
            {/* Прокрутка по обеим осям: на телефоне таблица не вылезает за край. */}
            <div className="overflow-x-auto" style={{ maxHeight: 360, overflowY: 'auto' }}>
              <table
                className={`${Classes.HTML_TABLE} ${Classes.HTML_TABLE_CONDENSED}`}
                style={{ width: '100%' }}
              >
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td style={{ width: 32 }}>
                        <Checkbox
                          checked={!excluded.has(item.id)}
                          onChange={() => toggle(item.id)}
                          aria-label={intl.get('banking.rules.apply_past.row_checkbox')}
                          style={{ margin: 0 }}
                        />
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(item.date)}</td>
                      <td>{item.payee || item.description || '—'}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {formattedAmount(item.amount, item.currencyCode ?? item.currency_code ?? '')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hidden > 0 && (
              <p className={Classes.TEXT_MUTED} style={{ marginTop: 8, fontSize: 12 }}>
                {intl.get('banking.rules.apply_past.hidden', { hidden })}
              </p>
            )}
          </>
        )}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={close}>{intl.get('banking.rules.apply_past.not_now')}</Button>
          <Button
            intent={Intent.PRIMARY}
            loading={isApplying}
            disabled={selected.length === 0}
            onClick={handleApply}
          >
            {intl.get('banking.rules.apply_past.apply', { count: selected.length })}
          </Button>
        </div>
      </div>
    </>
  );
}

const ApplyToPastContent = compose(withDialogActions)(ApplyToPastContentRoot);

function ApplyToPastDialogRoot({
  dialogName,
  payload: { ruleId = null } = { ruleId: null },
  isOpen,
}: DialogReduxProps<{ ruleId?: number | null }>) {
  return (
    <Dialog
      name={dialogName}
      title={intl.get('banking.rules.apply_past.title')}
      isOpen={isOpen}
      canEscapeKeyClose={true}
      autoFocus={true}
      style={{ width: 640 }}
    >
      <DialogSuspense>
        {ruleId ? <ApplyToPastContent ruleId={Number(ruleId)} /> : null}
      </DialogSuspense>
    </Dialog>
  );
}

export const ApplyToPastDialog = compose(withDialogRedux())(ApplyToPastDialogRoot);

ApplyToPastDialog.displayName = 'ApplyToPastDialog';
