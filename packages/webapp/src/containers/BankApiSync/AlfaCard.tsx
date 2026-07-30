// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConnectBank, useDisconnectBank } from '@/hooks/query/bankApiSync';

interface AlfaCardProps {
  connected: boolean;
}

/**
 * Подключение Альфа-Банка: OAuth-приложение (client_id/secret) плюс
 * долгоживущий refresh-токен. Регистрируется в банке заранее.
 */
export function AlfaCard({ connected }: AlfaCardProps) {
  const [clientId, setClientId] = React.useState('');
  const [clientSecret, setClientSecret] = React.useState('');
  const [refreshToken, setRefreshToken] = React.useState('');

  const connect = useConnectBank('alfa');
  const disconnect = useDisconnectBank('alfa');

  const filled = clientId && clientSecret && refreshToken;

  const handleConnect = async () => {
    try {
      await connect.mutateAsync({ clientId, clientSecret, refreshToken });
      setClientId('');
      setClientSecret('');
      setRefreshToken('');
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
    <div className="flex max-w-xl flex-col gap-3 rounded-md border p-4">
      <h2 className="font-medium">{intl.get('bank_api.alfa.title')}</h2>
      {connected ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-green-700">
            {intl.get('bank_api.alfa.connected')}
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
          <p className="text-sm text-muted-foreground">
            {intl.get('bank_api.alfa.hint')}
          </p>
          <label className="text-sm">{intl.get('bank_api.alfa.client_id')}</label>
          <Input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
          <label className="text-sm">
            {intl.get('bank_api.alfa.client_secret')}
          </label>
          <Input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
          />
          <label className="text-sm">
            {intl.get('bank_api.alfa.refresh_token')}
          </label>
          <Input
            type="password"
            value={refreshToken}
            onChange={(e) => setRefreshToken(e.target.value)}
          />
          <div className="flex justify-end">
            <Button onClick={handleConnect} disabled={!filled || connect.isLoading}>
              {intl.get('bank_api.action.connect')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
