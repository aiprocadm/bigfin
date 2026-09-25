// © 2026 Bigfin
import intl from 'react-intl-universal';
import { useFeatureCan } from '@/hooks/state/feature';
import {
  BankProviderId,
  useBankApiStatus,
} from '@/hooks/query/bankApiSync';
import { TinkoffCard } from './TinkoffCard';
import { AlfaCard } from './AlfaCard';
import { ImportStatementForm } from './ImportStatementForm';
import { ModuleDisabled } from '@/components/ui/module-disabled';
import { PageTitle } from '@/components/ui/page-title';

/**
 * ⑨c Страница банковских API: подключение банков волны 1 (Тинькофф,
 * Альфа-Банк) + импорт выписки за период в конвейер «Разбор».
 * За флагом `bank_api_sync`.
 */
export default function BankApiSyncPage() {
  const { featureCan } = useFeatureCan();
  const { data: status } = useBankApiStatus();

  if (!featureCan('bank_api_sync')) return <ModuleDisabled />;

  const connected = status?.connected ?? { tinkoff: false, alfa: false };
  const connectedProviders = (['tinkoff', 'alfa'] as BankProviderId[]).filter(
    (id) => connected[id],
  );

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <PageTitle>
          {intl.get('bank_api.page.title')}
        </PageTitle>
        <p className="text-sm text-muted-foreground">
          {intl.get('bank_api.page.subtitle')}
        </p>
      </div>

      <TinkoffCard connected={connected.tinkoff} />
      <AlfaCard connected={connected.alfa} />

      {connectedProviders.length > 0 && (
        <ImportStatementForm providers={connectedProviders} />
      )}
    </div>
  );
}
