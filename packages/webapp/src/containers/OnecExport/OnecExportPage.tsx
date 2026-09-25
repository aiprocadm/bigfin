// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import useApiRequest from '@/hooks/useRequest';
import { DateField } from '@/components/ui/date-field';
import { CashAccountField } from '@/components/ui/cash-account-field';
import { ModuleDisabled } from '@/components/ui/module-disabled';
import { EmptyState } from '@/components/ui/empty-state';
import { useCanExport } from '@/hooks/utils/useAbilityContext';
import { PageTitle } from '@/components/ui/page-title';

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
  const canExport = useCanExport();

  if (!featureCan('onec_export')) return <ModuleDisabled />;

  // Файл для 1С — унос данных: без права «Выгрузка данных» сервер ответит
  // 403 и откроется общий экран «нет доступа» (FT-082 ТЗ-3). Поэтому кнопки
  // скачивания нет — вместо неё объяснение, у кого просить право.
  if (!canExport) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden />}
          title={intl.get('export_right.no_access.title')}
          description={intl.get('export_right.no_access.description')}
        />
      </div>
    );
  }

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
        <PageTitle>{intl.get('onec_export.page.title')}</PageTitle>
        <p className="text-sm text-muted-foreground">
          {intl.get('onec_export.page.subtitle')}
        </p>
      </div>

      <div className="flex max-w-xl flex-col gap-2 rounded-control border p-4">
        <label className="text-sm">{intl.get('onec_export.account_id')}</label>
        <CashAccountField value={accountId} onChange={setAccountId} />
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
