// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useConnectBank,
  useDisconnectBank,
} from '@/hooks/query/bankApiSync';

interface TinkoffCardProps {
  connected: boolean;
}

/** Подключение Тинькофф Бизнес: один долгоживущий токен. */
export function TinkoffCard({ connected }: TinkoffCardProps) {
  const [token, setToken] = React.useState('');
  const connect = useConnectBank('tinkoff');
  const disconnect = useDisconnectBank('tinkoff');

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

  return (
    <div className="flex max-w-xl flex-col gap-3 rounded-control border p-4">
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
            <Button
              onClick={handleConnect}
              disabled={!token || connect.isLoading}
            >
              {intl.get('bank_api.action.connect')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
