// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useFeatureCan } from '@/hooks/state/feature';
import {
  usePullTelegramEntries,
  useSetTelegramEntryAccount,
  useTelegramEntryAccount,
} from '@/hooks/query/notifications';
import { useAccounts } from '@/hooks/query/accounts';

/**
 * ㉓ Быстрый ввод операций из Telegram: счёт для записи + ручное «забрать
 * сейчас» (иначе сообщения разбираются кроном раз в 5 минут).
 */
export function TelegramQuickEntryBlock() {
  const { featureCan } = useFeatureCan();
  const { data: entryAccount } = useTelegramEntryAccount();
  const { data: accounts } = useAccounts({}, {}) as { data?: any[] };
  const setAccount = useSetTelegramEntryAccount();
  const pullEntries = usePullTelegramEntries();

  if (!featureCan('telegram_quick_entry')) return null;

  // Операции ложатся на денежный счёт — как выписки и банк-API.
  const cashAccounts = (accounts ?? []).filter((a: any) =>
    ['bank', 'cash'].includes(a.account_type ?? a.accountType),
  );
  const selected = entryAccount?.accountId ?? '';

  const handleSelect = async (value: string) => {
    try {
      await setAccount.mutateAsync({ accountId: value ? Number(value) : null });
      toast.success(intl.get('notifications.telegram.entry.account_saved'));
    } catch {
      toast.error(intl.get('notifications.telegram.entry.account_save_failed'));
    }
  };

  const handlePull = async () => {
    try {
      const res: any = await pullEntries.mutateAsync();
      toast.success(
        intl.get('notifications.telegram.entry.pulled', {
          imported: res?.imported ?? 0,
          skipped: res?.skipped ?? 0,
        }),
      );
    } catch {
      toast.error(intl.get('notifications.telegram.entry.pull_failed'));
    }
  };

  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <p className="text-sm font-medium">
        {intl.get('notifications.telegram.entry.title')}
      </p>
      <p className="text-xs text-muted-foreground">
        {intl.get('notifications.telegram.entry.help')}
      </p>

      <div className="flex items-end gap-3 max-w-lg">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm">
            {intl.get('notifications.telegram.entry.account')}
          </label>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={selected}
            onChange={(e) => handleSelect(e.target.value)}
          >
            <option value="">
              {intl.get('notifications.telegram.entry.account_none')}
            </option>
            {cashAccounts.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handlePull}
          disabled={pullEntries.isLoading}
        >
          {intl.get('notifications.telegram.entry.pull')}
        </Button>
      </div>
    </div>
  );
}
