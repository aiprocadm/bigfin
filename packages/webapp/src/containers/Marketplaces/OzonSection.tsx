// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useConnectOzon,
  useDisconnectOzon,
  useOzonSummary,
} from '@/hooks/query/marketplaces';
import { SummaryCards } from './SummaryCards';

interface OzonSectionProps {
  connected: boolean;
  fromDate: string;
  toDate: string;
}

/**
 * ⑱ Подключение Ozon (Client-Id + Api-Key из кабинета продавца) и его
 * финансовая сводка за выбранный период.
 */
export function OzonSection({ connected, fromDate, toDate }: OzonSectionProps) {
  const [clientId, setClientId] = React.useState('');
  const [apiKey, setApiKey] = React.useState('');

  const connect = useConnectOzon();
  const disconnect = useDisconnectOzon();
  const { data: summary } = useOzonSummary(fromDate, toDate, {
    enabled: connected,
  });

  const handleConnect = async () => {
    try {
      await connect.mutateAsync({ clientId, apiKey });
      setClientId('');
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
    <>
      <div className="flex max-w-xl flex-col gap-3 rounded-md border p-4">
        <h2 className="font-medium">{intl.get('marketplaces.ozon.title')}</h2>
        {connected ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-green-700">
              {intl.get('marketplaces.ozon.connected')}
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
            <p className="text-xs text-muted-foreground">
              {intl.get('marketplaces.ozon.hint')}
            </p>
            <label className="text-sm">
              {intl.get('marketplaces.ozon.client_id')}
            </label>
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
            <label className="text-sm">
              {intl.get('marketplaces.ozon.api_key')}
            </label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleConnect}
                disabled={!clientId || !apiKey || connect.isLoading}
              >
                {intl.get('marketplaces.action.connect')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {connected && summary && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            {intl.get('marketplaces.ozon.title')}
          </h3>
          <SummaryCards summary={summary} />
        </div>
      )}
    </>
  );
}
