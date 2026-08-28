// © 2026 Bigfin
import React from 'react';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useAcquiringStatus,
  useYookassaSummary,
  useConnectYookassa,
  useDisconnectYookassa,
} from '@/hooks/query/acquiring';
import { DateField } from '@/components/ui/date-field';
import { ModuleDisabled } from '@/components/ui/module-disabled';

const monthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);
// Сумму печатает общая утилита продукта: она знает валюту организации и
// показывает рубль так, как принято — «45 000,00 ₽». Раньше здесь стоял
// свой Intl.NumberFormat без знака валюты, и число висело без подписи
// (Р1 карты v26).
const money = (v: number): string => formatOrganizationMoney(v);

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

/**
 * ⑨d Страница эквайринга: подключение YooKassa + сводка (выручка/комиссия/к
 * зачислению) за период, read-only. За флагом `acquiring`.
 */
export default function AcquiringPage() {
  const { featureCan } = useFeatureCan();
  const { data: status } = useAcquiringStatus();
  const [shopId, setShopId] = React.useState('');
  const [secretKey, setSecretKey] = React.useState('');
  const [from, setFrom] = React.useState(monthAgo());
  const [to, setTo] = React.useState(today());

  const connect = useConnectYookassa();
  const disconnect = useDisconnectYookassa();
  const connected = !!status?.yookassaConnected;
  const { data: summary } = useYookassaSummary(from, to, { enabled: connected });

  if (!featureCan('acquiring')) return <ModuleDisabled />;

  const handleConnect = async () => {
    try {
      await connect.mutateAsync({ shopId, secretKey });
      setShopId('');
      setSecretKey('');
      toast.success(intl.get('acquiring.connect.success'));
    } catch {
      toast.error(intl.get('acquiring.connect.error'));
    }
  };
  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync();
      toast.success(intl.get('acquiring.disconnect.success'));
    } catch {
      toast.error(intl.get('acquiring.disconnect.error'));
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">{intl.get('acquiring.page.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {intl.get('acquiring.page.subtitle')}
        </p>
      </div>

      <div className="flex max-w-xl flex-col gap-3 rounded-md border p-4">
        <h2 className="font-medium">{intl.get('acquiring.yookassa.title')}</h2>
        {connected ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-green-700">
              {intl.get('acquiring.yookassa.connected')}
            </span>
            <Button
              variant="secondary"
              onClick={handleDisconnect}
              disabled={disconnect.isLoading}
            >
              {intl.get('acquiring.action.disconnect')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-sm">{intl.get('acquiring.yookassa.shop_id')}</label>
            <Input value={shopId} onChange={(e) => setShopId(e.target.value)} />
            <label className="text-sm">{intl.get('acquiring.yookassa.secret_key')}</label>
            <Input
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleConnect}
                disabled={!shopId || !secretKey || connect.isLoading}
              >
                {intl.get('acquiring.action.connect')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {connected && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-end gap-2">
            <DateField value={from} onChange={setFrom} className="rounded border px-2 py-1 text-sm" />
            <span className="text-muted-foreground">—</span>
            <DateField value={to} onChange={setTo} className="rounded border px-2 py-1 text-sm" />
          </div>
          {summary && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Card title={intl.get('acquiring.summary.gross')} value={money(summary.gross)} />
              <Card title={intl.get('acquiring.summary.commission')} value={money(summary.commission)} />
              <Card title={intl.get('acquiring.summary.net')} value={money(summary.net)} />
              <Card title={intl.get('acquiring.summary.count')} value={String(summary.count ?? 0)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
