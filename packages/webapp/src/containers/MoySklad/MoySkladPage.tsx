// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useMoyskladStatus,
  useMoyskladPreview,
  useConnectMoysklad,
  useDisconnectMoysklad,
  MoyskladProduct,
  MoyskladSale,
} from '@/hooks/query/moysklad';

const money = (v: number): string =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(v ?? 0);

/**
 * ㉛ Страница интеграции МойСклад: подключение по токену + превью товаров и
 * продаж (read-only). За флагом `moysklad`.
 */
export default function MoySkladPage() {
  const { featureCan } = useFeatureCan();
  const { data: status } = useMoyskladStatus();
  const [token, setToken] = React.useState('');

  const connect = useConnectMoysklad();
  const disconnect = useDisconnectMoysklad();
  const connected = !!status?.connected;
  const { data: preview } = useMoyskladPreview({ enabled: connected });

  if (!featureCan('moysklad')) return null;

  const products: MoyskladProduct[] = preview?.products ?? [];
  const sales: MoyskladSale[] = preview?.sales ?? [];

  const handleConnect = async () => {
    try {
      await connect.mutateAsync({ token });
      setToken('');
      toast.success(intl.get('moysklad.connect.success'));
    } catch {
      toast.error(intl.get('moysklad.connect.error'));
    }
  };
  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync();
      toast.success(intl.get('moysklad.disconnect.success'));
    } catch {
      toast.error(intl.get('moysklad.disconnect.error'));
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">{intl.get('moysklad.page.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {intl.get('moysklad.page.subtitle')}
        </p>
      </div>

      <div className="flex max-w-xl flex-col gap-3 rounded-md border p-4">
        {connected ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-green-700">
              {intl.get('moysklad.connected')}
            </span>
            <Button
              variant="secondary"
              onClick={handleDisconnect}
              disabled={disconnect.isLoading}
            >
              {intl.get('moysklad.action.disconnect')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-sm">{intl.get('moysklad.token')}</label>
            <Input
              type="password"
              placeholder="..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <div className="flex justify-end">
              <Button onClick={handleConnect} disabled={!token || connect.isLoading}>
                {intl.get('moysklad.action.connect')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {connected && (
        <>
          <PreviewTable
            title={intl.get('moysklad.products.title')}
            cols={[
              intl.get('moysklad.products.name'),
              intl.get('moysklad.products.code'),
              intl.get('moysklad.products.sell'),
              intl.get('moysklad.products.cost'),
            ]}
            rows={products.map((p) => [p.name, p.code, money(p.sellPrice), money(p.costPrice)])}
          />
          <PreviewTable
            title={intl.get('moysklad.sales.title')}
            cols={[intl.get('moysklad.sales.name'), intl.get('moysklad.sales.amount')]}
            rows={sales.map((s) => [s.name, money(s.amount)])}
          />
        </>
      )}
    </div>
  );
}

function PreviewTable({
  title,
  cols,
  rows,
}: {
  title: string;
  cols: string[];
  rows: string[][];
}) {
  return (
    <div className="rounded-md border p-4">
      <h2 className="mb-2 font-medium">{title}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            {cols.map((c) => (
              <th key={c} className="py-1">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              {r.map((cell, j) => (
                <td key={j} className="py-1">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
