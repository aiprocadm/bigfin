// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useCrmStatus,
  useConnectBitrix24,
  useDisconnectBitrix24,
  useConnectAmocrm,
  useDisconnectAmocrm,
  useRunCrmSync,
  useGenerateOwnCrmToken,
  CrmSyncResult,
} from '@/hooks/query/crmIntegration';
import { ModuleDisabled } from '@/components/ui/module-disabled';

/**
 * ⑯a Страница CRM-интеграции: подключение Битрикс24 (webhook-URL) и запуск
 * односторонней синхронизации CRM → Bigfin. За флагом `crm_integration`.
 */
export default function CrmIntegrationPage() {
  const { featureCan } = useFeatureCan();
  const { data: status } = useCrmStatus();
  const [webhookUrl, setWebhookUrl] = React.useState('');
  const [subdomain, setSubdomain] = React.useState('');
  const [accessToken, setAccessToken] = React.useState('');
  const [lastResult, setLastResult] = React.useState<CrmSyncResult | null>(null);

  const connect = useConnectBitrix24();
  const disconnect = useDisconnectBitrix24();
  const connectAmo = useConnectAmocrm();
  const disconnectAmo = useDisconnectAmocrm();
  const sync = useRunCrmSync();
  const genToken = useGenerateOwnCrmToken();
  const [webhookUrlOwn, setWebhookUrlOwn] = React.useState('');

  const handleGenToken = async () => {
    try {
      const res: any = await genToken.mutateAsync();
      const token = (res?.data?.data ?? res?.data ?? res)?.token;
      setWebhookUrlOwn(
        `${window.location.origin}/api/crm/webhooks/inbound?token=${token}`,
      );
    } catch {
      toast.error(intl.get('crm_integration.owncrm.error'));
    }
  };

  if (!featureCan('crm_integration')) return <ModuleDisabled />;

  const connected = !!status?.bitrix24Connected;
  const amoConnected = !!status?.amocrmConnected;
  const anyConnected = connected || amoConnected;

  const handleConnectAmo = async () => {
    try {
      await connectAmo.mutateAsync({ subdomain, accessToken });
      setSubdomain('');
      setAccessToken('');
      toast.success(intl.get('crm_integration.connect.success'));
    } catch {
      toast.error(intl.get('crm_integration.connect.error'));
    }
  };

  const handleDisconnectAmo = async () => {
    try {
      await disconnectAmo.mutateAsync();
      toast.success(intl.get('crm_integration.disconnect.success'));
    } catch {
      toast.error(intl.get('crm_integration.disconnect.error'));
    }
  };

  const handleConnect = async () => {
    try {
      await connect.mutateAsync({ webhookUrl });
      setWebhookUrl('');
      toast.success(intl.get('crm_integration.connect.success'));
    } catch {
      toast.error(intl.get('crm_integration.connect.error'));
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync();
      toast.success(intl.get('crm_integration.disconnect.success'));
    } catch {
      toast.error(intl.get('crm_integration.disconnect.error'));
    }
  };

  const handleSync = async () => {
    try {
      const res: any = await sync.mutateAsync();
      const result: CrmSyncResult = res?.data?.data ?? res?.data ?? res;
      setLastResult(result);
      toast.success(
        intl.get('crm_integration.sync.done', {
          deals: result.dealsImported,
          contacts: result.contactsImported,
        }),
      );
    } catch {
      toast.error(intl.get('crm_integration.sync.error'));
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">
          {intl.get('crm_integration.page.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {intl.get('crm_integration.page.subtitle')}
        </p>
      </div>

      <div className="flex max-w-xl flex-col gap-3 rounded-md border p-4">
        <h2 className="font-medium">{intl.get('crm_integration.bitrix24.title')}</h2>

        {connected ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-green-700">
              {intl.get('crm_integration.bitrix24.connected')}
            </span>
            <Button
              variant="secondary"
              onClick={handleDisconnect}
              disabled={disconnect.isLoading}
            >
              {intl.get('crm_integration.action.disconnect')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-sm">
              {intl.get('crm_integration.webhook_url')}
            </label>
            <Input
              type="url"
              placeholder="https://example.bitrix24.ru/rest/1/xxxx/"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleConnect}
                disabled={!webhookUrl || connect.isLoading}
              >
                {intl.get('crm_integration.action.connect')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex max-w-xl flex-col gap-3 rounded-md border p-4">
        <h2 className="font-medium">{intl.get('crm_integration.amocrm.title')}</h2>

        {amoConnected ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-green-700">
              {intl.get('crm_integration.amocrm.connected')}
            </span>
            <Button
              variant="secondary"
              onClick={handleDisconnectAmo}
              disabled={disconnectAmo.isLoading}
            >
              {intl.get('crm_integration.action.disconnect')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-sm">
              {intl.get('crm_integration.amocrm.subdomain')}
            </label>
            <Input
              type="text"
              placeholder="mycompany"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
            />
            <label className="text-sm">
              {intl.get('crm_integration.amocrm.token')}
            </label>
            <Input
              type="password"
              placeholder="eyJ0eXAiOiJKV1Qi..."
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleConnectAmo}
                disabled={!subdomain || !accessToken || connectAmo.isLoading}
              >
                {intl.get('crm_integration.action.connect')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex max-w-xl flex-col gap-3 rounded-md border p-4">
        <h2 className="font-medium">{intl.get('crm_integration.owncrm.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {intl.get('crm_integration.owncrm.hint')}
        </p>
        <div className="flex justify-end">
          <Button onClick={handleGenToken} disabled={genToken.isLoading}>
            {intl.get('crm_integration.owncrm.get_url')}
          </Button>
        </div>
        {webhookUrlOwn && (
          <code className="break-all rounded bg-muted p-2 text-xs">
            {webhookUrlOwn}
          </code>
        )}
      </div>

      {anyConnected && (
        <div className="flex max-w-xl flex-col gap-3 rounded-md border p-4">
          <h2 className="font-medium">{intl.get('crm_integration.sync.title')}</h2>
          <div className="flex justify-end">
            <Button onClick={handleSync} disabled={sync.isLoading}>
              {intl.get('crm_integration.action.sync')}
            </Button>
          </div>
          {lastResult && (
            <p className="text-sm text-muted-foreground">
              {intl.get('crm_integration.sync.summary', {
                deals: lastResult.dealsImported,
                dealsSkipped: lastResult.dealsSkipped,
                contacts: lastResult.contactsImported,
                contactsSkipped: lastResult.contactsSkipped,
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
