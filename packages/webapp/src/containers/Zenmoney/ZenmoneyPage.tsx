// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { CashAccountField } from '@/components/ui/cash-account-field';
import { toast } from 'sonner';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useZenmoneyStatus,
  useConnectZenmoney,
  useDisconnectZenmoney,
  useImportZenmoney,
} from '@/hooks/query/zenmoney';
import { ModuleDisabled } from '@/components/ui/module-disabled';
import { PageTitle } from '@/components/ui/page-title';

/**
 * ⑨b Страница импорта Дзенмани: подключение токеном + импорт операций в
 * конвейер «Разбор». За флагом `zenmoney_import`.
 */
export default function ZenmoneyPage() {
  const { featureCan } = useFeatureCan();
  const { data: status } = useZenmoneyStatus();
  const [token, setToken] = React.useState('');
  const [accountId, setAccountId] = React.useState('');

  const connect = useConnectZenmoney();
  const disconnect = useDisconnectZenmoney();
  const importOps = useImportZenmoney();
  const connected = !!status?.connected;

  if (!featureCan('zenmoney_import')) return <ModuleDisabled />;

  const handleConnect = async () => {
    try {
      await connect.mutateAsync({ token });
      setToken('');
      toast.success(intl.get('zenmoney.connect.success'));
    } catch {
      toast.error(intl.get('zenmoney.connect.error'));
    }
  };
  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync();
      toast.success(intl.get('zenmoney.disconnect.success'));
    } catch {
      toast.error(intl.get('zenmoney.disconnect.error'));
    }
  };
  const handleImport = async () => {
    try {
      const res: any = await importOps.mutateAsync({ accountId: Number(accountId) });
      const r = res?.data?.data ?? res?.data ?? res;
      toast.success(
        intl.get('zenmoney.import.done', { imported: r.imported, skipped: r.skipped }),
      );
    } catch {
      toast.error(intl.get('zenmoney.import.error'));
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <PageTitle>{intl.get('zenmoney.page.title')}</PageTitle>
        <p className="text-sm text-muted-foreground">
          {intl.get('zenmoney.page.subtitle')}
        </p>
      </div>

      <div className="flex max-w-xl flex-col gap-3 rounded-control border p-4">
        {connected ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-green-700">
              {intl.get('zenmoney.connected')}
            </span>
            <Button
              variant="secondary"
              onClick={handleDisconnect}
              disabled={disconnect.isLoading}
            >
              {intl.get('zenmoney.action.disconnect')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-sm">{intl.get('zenmoney.token')}</label>
            <Input
              type="password"
              placeholder="..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <div className="flex justify-end">
              <Button onClick={handleConnect} disabled={!token || connect.isLoading}>
                {intl.get('zenmoney.action.connect')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {connected && (
        <div className="flex max-w-xl flex-col gap-2 rounded-control border p-4">
          <h2 className="font-medium">{intl.get('zenmoney.import.title')}</h2>
          <label className="text-sm">{intl.get('zenmoney.import.account_id')}</label>
          <CashAccountField value={accountId} onChange={setAccountId} />
          <div className="flex justify-end">
            <Button
              onClick={handleImport}
              disabled={!accountId || importOps.isLoading}
            >
              {intl.get('zenmoney.action.import')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
