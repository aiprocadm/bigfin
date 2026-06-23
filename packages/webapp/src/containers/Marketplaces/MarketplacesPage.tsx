// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useMarketplacesStatus,
  useWildberriesSummary,
  useConnectWildberries,
  useDisconnectWildberries,
} from '@/hooks/query/marketplaces';

const monthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);
const money = (v: number): string =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(v ?? 0);

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

/**
 * ⑱ Страница маркетплейсов: подключение Wildberries + финансовая сводка за
 * период (выручка за вычетом удержаний), read-only. За флагом `marketplaces`.
 */
export default function MarketplacesPage() {
  const { featureCan } = useFeatureCan();
  const { data: status } = useMarketplacesStatus();
  const [apiKey, setApiKey] = React.useState('');
  const [fromDate, setFromDate] = React.useState(monthAgo());
  const [toDate, setToDate] = React.useState(today());

  const connect = useConnectWildberries();
  const disconnect = useDisconnectWildberries();
  const connected = !!status?.wildberriesConnected;
  const { data: summary } = useWildberriesSummary(fromDate, toDate, {
    enabled: connected,
  });

  if (!featureCan('marketplaces')) return null;

  const handleConnect = async () => {
    try {
      await connect.mutateAsync({ apiKey });
      setApiKey('');
      toast.success(intl.get('marketplaces.connect.success'));
    } catch {
      toast.error(intl.get('marketplaces.connect.error'));
    }
  };
  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync();
      toast.success(intl.get('marketplaces.disconnect.success'));
    } catch {
      toast.error(intl.get('marketplaces.disconnect.error'));
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">
          {intl.get('marketplaces.page.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {intl.get('marketplaces.page.subtitle')}
        </p>
      </div>

      <div className="flex max-w-xl flex-col gap-3 rounded-md border p-4">
        <h2 className="font-medium">{intl.get('marketplaces.wb.title')}</h2>
        {connected ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-green-700">
              {intl.get('marketplaces.wb.connected')}
            </span>
            <Button
              variant="secondary"
              onClick={handleDisconnect}
              disabled={disconnect.isLoading}
            >
              {intl.get('marketplaces.action.disconnect')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-sm">{intl.get('marketplaces.wb.api_key')}</label>
            <Input
              type="password"
              placeholder="..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <div className="flex justify-end">
              <Button onClick={handleConnect} disabled={!apiKey || connect.isLoading}>
                {intl.get('marketplaces.action.connect')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {connected && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-end gap-2">
            <input
              type="date"
              className="rounded border px-2 py-1 text-sm"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <span className="text-muted-foreground">—</span>
            <input
              type="date"
              className="rounded border px-2 py-1 text-sm"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          {summary && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <Card title={intl.get('marketplaces.summary.revenue')} value={money(summary.revenue)} />
              <Card title={intl.get('marketplaces.summary.to_pay')} value={money(summary.toPay)} />
              <Card title={intl.get('marketplaces.summary.deductions')} value={money(summary.deductions)} />
              <Card title={intl.get('marketplaces.summary.logistics')} value={money(summary.logistics)} />
              <Card title={intl.get('marketplaces.summary.penalties')} value={money(summary.penalties)} />
              <Card title={intl.get('marketplaces.summary.storage')} value={money(summary.storage)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
