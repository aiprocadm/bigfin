// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useBankApiStatus,
  useConnectTinkoff,
  useDisconnectTinkoff,
  useImportTinkoff,
} from '@/hooks/query/bankApiSync';

const monthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

/**
 * ⑨c Страница банковских API: подключение Тинькофф + импорт выписки за период
 * в конвейер «Разбор». За флагом `bank_api_sync`.
 */
export default function BankApiSyncPage() {
  const { featureCan } = useFeatureCan();
  const { data: status } = useBankApiStatus();
  const [token, setToken] = React.useState('');
  const [accountId, setAccountId] = React.useState('');
  const [accountNumber, setAccountNumber] = React.useState('');
  const [from, setFrom] = React.useState(monthAgo());
  const [to, setTo] = React.useState(today());

  const connect = useConnectTinkoff();
  const disconnect = useDisconnectTinkoff();
  const importStmt = useImportTinkoff();
  const connected = !!status?.tinkoffConnected;

  if (!featureCan('bank_api_sync')) return null;

  const handleConnect = async () => {
    try {
      await connect.mutateAsync({ token });
      setToken('');
      toast.success(intl.get('bank_api.connect.success'));
    } catch {
      toast.error(intl.get('bank_api.connect.error'));
    }
  };
  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync();
      toast.success(intl.get('bank_api.disconnect.success'));
    } catch {
      toast.error(intl.get('bank_api.disconnect.error'));
    }
  };
  const handleImport = async () => {
    try {
      const res: any = await importStmt.mutateAsync({
        accountId: Number(accountId),
        accountNumber,
        from,
        to,
      });
      const r = res?.data?.data ?? res?.data ?? res;
      toast.success(
        intl.get('bank_api.import.done', {
          imported: r.imported,
          skipped: r.skipped,
        }),
      );
    } catch {
      toast.error(intl.get('bank_api.import.error'));
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">{intl.get('bank_api.page.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {intl.get('bank_api.page.subtitle')}
        </p>
      </div>

      <div className="flex max-w-xl flex-col gap-3 rounded-md border p-4">
        <h2 className="font-medium">{intl.get('bank_api.tinkoff.title')}</h2>
        {connected ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-green-700">
              {intl.get('bank_api.tinkoff.connected')}
            </span>
            <Button
              variant="secondary"
              onClick={handleDisconnect}
              disabled={disconnect.isLoading}
            >
              {intl.get('bank_api.action.disconnect')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-sm">{intl.get('bank_api.tinkoff.token')}</label>
            <Input
              type="password"
              placeholder="..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <div className="flex justify-end">
              <Button onClick={handleConnect} disabled={!token || connect.isLoading}>
                {intl.get('bank_api.action.connect')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {connected && (
        <div className="flex max-w-xl flex-col gap-2 rounded-md border p-4">
          <h2 className="font-medium">{intl.get('bank_api.import.title')}</h2>
          <label className="text-sm">{intl.get('bank_api.import.account_id')}</label>
          <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} />
          <label className="text-sm">{intl.get('bank_api.import.account_number')}</label>
          <Input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="rounded border px-2 py-1 text-sm"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <span className="text-muted-foreground">—</span>
            <input
              type="date"
              className="rounded border px-2 py-1 text-sm"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleImport}
              disabled={!accountId || !accountNumber || importStmt.isLoading}
            >
              {intl.get('bank_api.action.import')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
