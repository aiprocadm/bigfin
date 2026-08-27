// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useApiRequest from '@/hooks/useRequest';
import { DateField } from '@/components/ui/date-field';

const monthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

/**
 * ⑩ Страница выгрузки в 1С: формирует файл `1CClientBankExchange` по денежному
 * счёту за период и скачивает его. За флагом `onec_export`.
 */
export default function OnecExportPage() {
  const { featureCan } = useFeatureCan();
  const apiRequest: any = useApiRequest();
  const [accountId, setAccountId] = React.useState('');
  const [from, setFrom] = React.useState(monthAgo());
  const [to, setTo] = React.useState(today());
  const [loading, setLoading] = React.useState(false);

  if (!featureCan('onec_export')) return null;

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await apiRequest.get('onec-export', {
        params: { accountId: Number(accountId), from, to },
        responseType: 'text',
      });
      const text: string = typeof res.data === 'string' ? res.data : String(res.data);
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '1c_export.txt';
      a.click();
      URL.revokeObjectURL(url);
      toast.success(intl.get('onec_export.done'));
    } catch {
      toast.error(intl.get('onec_export.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">{intl.get('onec_export.page.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {intl.get('onec_export.page.subtitle')}
        </p>
      </div>

      <div className="flex max-w-xl flex-col gap-2 rounded-md border p-4">
        <label className="text-sm">{intl.get('onec_export.account_id')}</label>
        <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} />
        <div className="flex items-center gap-2">
          <DateField value={from} onChange={setFrom} className="rounded border px-2 py-1 text-sm" />
          <span className="text-muted-foreground">—</span>
          <DateField value={to} onChange={setTo} className="rounded border px-2 py-1 text-sm" />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleDownload} disabled={!accountId || loading}>
            {intl.get('onec_export.action.download')}
          </Button>
        </div>
      </div>
    </div>
  );
}
