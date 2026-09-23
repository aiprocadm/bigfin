// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { MoreHorizontal } from 'lucide-react';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DialogsName } from '@/constants/dialogs';
import { useDialogActions, useDrawerActions } from '@/hooks/state';
import { useCashflowAccounts } from '@/hooks/query';
import { useDeals } from '@/hooks/query/deals';
import { useMoveToTrash } from '@/hooks/query/bankingTrash';
import {
  serverMessage,
  useConvertToTransfer,
  useLinkTransactionDeal,
  useSetTransactionTag,
  useTransactionHistory,
  useTransactionTags,
} from '@/hooks/query/transactionActions';
import useApiRequest from '@/hooks/useRequest';
import { PlannedOperationDialog } from '@/containers/PaymentCalendar/PlannedOperationDialog';
import { handleCashFlowTransactionType } from '../AccountTransactions/utils';
import {
  clonePrefill,
  recurringDraftFromRow,
  registryRowActions,
  ruleDraftFromRow,
  type RegistryRowAction,
} from './registryRowActions';

const referenceOf = (row: any) => ({
  referenceType: String(row.reference_type ?? row.referenceType ?? ''),
  referenceId: Number(row.reference_id ?? row.referenceId),
});

const toastError = (error: any, fallbackKey: string) =>
  AppToaster.show({ message: serverMessage(error, intl.get(fallbackKey)), intent: Intent.DANGER });

const toastDone = (key: string) => AppToaster.show({ message: intl.get(key), intent: Intent.SUCCESS });

/**
 * Меню операции (FT-022 ТЗ-3): девять пунктов. Недоступный пункт не
 * прячется, а говорит, ПОЧЕМУ недоступен, — иначе человек ищет действие,
 * которого «нет», и думает, что продукт его не умеет.
 */
export function RegistryRowMenu({
  row,
  projectsEnabled,
  onAction,
}: {
  row: any;
  projectsEnabled: boolean;
  onAction: (action: RegistryRowAction, row: any) => void;
}) {
  const actions = registryRowActions(row, { projectsEnabled });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={intl.get('all_transactions.actions.menu')}
          // Щелчок по кнопке меню не должен открывать карточку строки.
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.id}
            disabled={!action.available}
            onSelect={() => action.available && onAction(action.id, row)}
            className="flex flex-col items-start"
          >
            <span>{intl.get(`all_transactions.actions.${action.id}`)}</span>
            {!action.available && action.reasonKey && (
              <span className="text-xs text-text-muted">{intl.get(action.reasonKey)}</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Исполнитель действий меню: одни выполняются сразу (правило, копия,
 * разбиение в карточке), другие открывают окно здесь же.
 */
export function useRegistryRowActions() {
  const { openDialog } = useDialogActions();
  const { openDrawer } = useDrawerActions();
  const api = useApiRequest();
  const [active, setActive] = React.useState<{ action: RegistryRowAction; row: any } | null>(null);

  const run = React.useCallback(
    async (action: RegistryRowAction, row: any) => {
      if (action === 'create_rule') {
        openDialog(DialogsName.BankRuleForm, { prefill: ruleDraftFromRow(row) });
        return;
      }
      if (action === 'split') {
        // Части правятся в карточке операции — там видна и сама операция.
        handleCashFlowTransactionType(row, openDrawer);
        return;
      }
      if (action === 'clone') {
        try {
          const response = await api.get(`banking/transactions/${referenceOf(row).referenceId}`);
          const plan = clonePrefill(response.data?.data ?? response.data);
          openDialog(plan.dialog === 'money-out' ? DialogsName.MoneyOutForm : DialogsName.MoneyInForm, {
            account_id: plan.accountId,
            account_name: plan.accountName,
            prefill: plan.prefill,
          });
        } catch (error) {
          toastError(error, 'all_transactions.actions.failed');
        }
        return;
      }
      setActive({ action, row });
    },
    [api, openDialog, openDrawer],
  );

  const dialogs = active ? <RegistryActionDialog {...active} onClose={() => setActive(null)} /> : null;
  return { run, dialogs };
}

function RegistryActionDialog({
  action,
  row,
  onClose,
}: {
  action: RegistryRowAction;
  row: any;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-h-[calc(100vh-3rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{intl.get(`all_transactions.actions.${action}`)}</DialogTitle>
        </DialogHeader>
        {action === 'tag' && <TagForm row={row} onClose={onClose} />}
        {action === 'link_deal' && <DealForm row={row} onClose={onClose} />}
        {action === 'convert_transfer' && <TransferForm row={row} onClose={onClose} />}
        {action === 'history' && <HistoryList row={row} />}
        {action === 'delete' && <DeleteConfirm row={row} onClose={onClose} />}
        {action === 'make_recurring' && (
          <PlannedOperationDialog
            operation={
              recurringDraftFromRow(
                row,
                moment(row.date ?? undefined).add(1, 'month').format('YYYY-MM-DD'),
              ) as any
            }
            onDone={onClose}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TagForm({ row, onClose }: { row: any; onClose: () => void }) {
  const [tag, setTag] = React.useState<string>(row.tag ?? '');
  const { data: tags = [] } = useTransactionTags();
  const { mutateAsync, isLoading } = useSetTransactionTag();
  const save = async (value: string | null) => {
    try {
      await mutateAsync({ ...referenceOf(row), tag: value });
      toastDone(value ? 'all_transactions.actions.tag_saved' : 'all_transactions.actions.tag_removed');
      onClose();
    } catch (error) {
      toastError(error, 'all_transactions.actions.failed');
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <Input
        autoFocus
        maxLength={64}
        list="registry-tags"
        value={tag}
        placeholder={intl.get('all_transactions.actions.tag_placeholder')}
        onChange={(event) => setTag(event.target.value)}
      />
      <datalist id="registry-tags">
        {tags.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <DialogFooter>
        {row.tag && (
          <Button type="button" variant="secondary" disabled={isLoading} onClick={() => save(null)}>
            {intl.get('all_transactions.actions.tag_remove')}
          </Button>
        )}
        <Button type="button" disabled={isLoading || !tag.trim()} onClick={() => save(tag)}>
          {intl.get('save')}
        </Button>
      </DialogFooter>
    </div>
  );
}

function DealForm({ row, onClose }: { row: any; onClose: () => void }) {
  const { data: deals = [] } = useDeals({}, {});
  const [dealId, setDealId] = React.useState<string>('');
  const { mutateAsync, isLoading } = useLinkTransactionDeal();
  const save = async (value: number | null) => {
    try {
      await mutateAsync({ id: referenceOf(row).referenceId, dealId: value });
      toastDone(value ? 'all_transactions.actions.deal_linked' : 'all_transactions.actions.deal_unlinked');
      onClose();
    } catch (error) {
      toastError(error, 'all_transactions.actions.failed');
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <select
        className="min-h-[36px] rounded-control border border-border bg-surface px-2 py-1 text-sm"
        value={dealId}
        onChange={(event) => setDealId(event.target.value)}
      >
        <option value="">{intl.get('all_transactions.actions.deal_placeholder')}</option>
        {(deals as any[]).map((deal) => (
          <option key={deal.id} value={deal.id}>
            {deal.name}
          </option>
        ))}
      </select>
      <DialogFooter>
        <Button type="button" variant="secondary" disabled={isLoading} onClick={() => save(null)}>
          {intl.get('all_transactions.actions.deal_unlink')}
        </Button>
        <Button type="button" disabled={isLoading || !dealId} onClick={() => save(Number(dealId))}>
          {intl.get('save')}
        </Button>
      </DialogFooter>
    </div>
  );
}

function TransferForm({ row, onClose }: { row: any; onClose: () => void }) {
  const { data: accounts = [] } = useCashflowAccounts();
  const [toAccountId, setToAccountId] = React.useState<string>('');
  const { mutateAsync, isLoading } = useConvertToTransfer();
  const own = Number(row.account_id ?? row.accountId);
  const save = async () => {
    try {
      await mutateAsync({ id: referenceOf(row).referenceId, toAccountId: Number(toAccountId) });
      toastDone('all_transactions.actions.transfer_done');
      onClose();
    } catch (error) {
      // Сервер объясняет отказ: другая валюта, есть части, уже перевод.
      toastError(error, 'all_transactions.actions.failed');
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">{intl.get('all_transactions.actions.transfer_hint')}</p>
      <select
        className="min-h-[36px] rounded-control border border-border bg-surface px-2 py-1 text-sm"
        value={toAccountId}
        onChange={(event) => setToAccountId(event.target.value)}
      >
        <option value="">{intl.get('all_transactions.actions.transfer_placeholder')}</option>
        {(accounts as any[])
          .filter((account) => Number(account.id) !== own)
          .map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
      </select>
      <DialogFooter>
        <Button type="button" disabled={isLoading || !toAccountId} onClick={save}>
          {intl.get('all_transactions.actions.convert_transfer')}
        </Button>
      </DialogFooter>
    </div>
  );
}

function DeleteConfirm({ row, onClose }: { row: any; onClose: () => void }) {
  const { mutateAsync, isLoading } = useMoveToTrash();
  const remove = async () => {
    try {
      await mutateAsync([{ kind: 'cashflow', id: referenceOf(row).referenceId }]);
      toastDone('cash_flow_transaction.delete.trashed');
      onClose();
    } catch (error) {
      toastError(error, 'all_transactions.actions.failed');
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">{intl.get('cash_flow_transaction.delete.to_trash')}</p>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          {intl.get('cancel')}
        </Button>
        <Button type="button" variant="destructive" disabled={isLoading} onClick={remove}>
          {intl.get('delete')}
        </Button>
      </DialogFooter>
    </div>
  );
}

/** История изменений (FT-026): кто, когда, что изменил. */
export function HistoryList({ row }: { row: any }) {
  const { data, isLoading } = useTransactionHistory(referenceOf(row));
  const items = data?.items ?? [];
  if (isLoading) return <p className="text-sm text-text-muted">{intl.get('all_transactions.history.loading')}</p>;
  if (items.length === 0) return <p className="text-sm text-text-muted">{intl.get('all_transactions.history.empty')}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.key} className="rounded-control border border-border px-3 py-2 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="font-medium">
              {intl.get(`all_transactions.history.action.${item.action}`) || item.action}
            </span>
            <span className="text-text-muted tabular-nums">{moment(item.at).format('DD.MM.YYYY HH:mm')}</span>
          </div>
          <div className="text-text-muted">
            {item.source === 'rule'
              ? intl.get('all_transactions.history.by_rule', { name: item.actor ?? '—' })
              : item.actor ?? intl.get('all_transactions.history.by_system')}
            {item.details?.tag ? ` · ${intl.get('all_transactions.history.tag', { tag: item.details.tag })}` : ''}
          </div>
        </li>
      ))}
    </ul>
  );
}
