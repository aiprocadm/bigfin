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
import { OzonSection } from './OzonSection';
import { SummaryCards } from './SummaryCards';
import { DateField } from '@/components/ui/date-field';
import { ModuleDisabled } from '@/components/ui/module-disabled';

const monthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);
/**
 * ⑱ Страница маркетплейсов: подключение Wildberries и Ozon + финансовая
 * сводка за период (выручка за вычетом удержаний), read-only.
 * За флагом `marketplaces`.
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
  const ozonConnected = !!status?.ozonConnected;
  const { data: summary } = useWildberriesSummary(fromDate, toDate, {
    enabled: connected,
  });

  if (!featureCan('marketplaces')) return <ModuleDisabled />;

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

      <div className="flex max-w-xl flex-col gap-3 rounded-control border p-4">
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

      <OzonSection
        connected={ozonConnected}
        fromDate={fromDate}
        toDate={toDate}
      />

      {(connected || ozonConnected) && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-end gap-2">
            <DateField value={fromDate} onChange={setFromDate} className="rounded border px-2 py-1 text-sm" />
            <span className="text-muted-foreground">—</span>
            <DateField value={toDate} onChange={setToDate} className="rounded border px-2 py-1 text-sm" />
          </div>
          {summary && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                {intl.get('marketplaces.wb.title')}
              </h3>
              <SummaryCards summary={summary} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
