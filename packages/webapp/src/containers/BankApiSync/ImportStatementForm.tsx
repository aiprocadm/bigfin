// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BankProviderId,
  useImportBankStatement,
} from '@/hooks/query/bankApiSync';
import { DateField } from '@/components/ui/date-field';

const monthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

interface ImportStatementFormProps {
  /** Банки, из которых можно импортировать (подключённые). */
  providers: BankProviderId[];
}

/** Импорт выписки за период в конвейер «Разбор» ⑨. */
export function ImportStatementForm({ providers }: ImportStatementFormProps) {
  const [provider, setProvider] = React.useState<BankProviderId>(providers[0]);
  const [accountId, setAccountId] = React.useState('');
  const [accountNumber, setAccountNumber] = React.useState('');
  const [from, setFrom] = React.useState(monthAgo());
  const [to, setTo] = React.useState(today());

  const importStmt = useImportBankStatement(provider);

  // Отключили банк, выбранный в форме — переключаемся на доступный.
  React.useEffect(() => {
    if (!providers.includes(provider)) setProvider(providers[0]);
  }, [providers, provider]);

  const handleImport = async () => {
    try {
      const res: any = await importStmt.mutateAsync({
        accountId: Number(accountId),
        accountNumber,
        from,
        to,
      });
      const r = res?.data?.data ?? res?.data ?? res;
      toast.success(
        intl.get('bank_api.import.done', {
          imported: r.imported,
          skipped: r.skipped,
        }),
      );
    } catch {
      toast.error(intl.get('bank_api.import.error'));
    }
  };

  return (
    <div className="flex max-w-xl flex-col gap-2 rounded-md border p-4">
      <h2 className="font-medium">{intl.get('bank_api.import.title')}</h2>

      {providers.length > 1 && (
        <>
          <label className="text-sm">{intl.get('bank_api.import.bank')}</label>
          <div className="flex gap-2">
            {providers.map((id) => (
              <Button
                key={id}
                type="button"
                variant={id === provider ? 'primary' : 'secondary'}
                onClick={() => setProvider(id)}
              >
                {intl.get(`bank_api.${id}.title`)}
              </Button>
            ))}
          </div>
        </>
      )}

      <label className="text-sm">{intl.get('bank_api.import.account_id')}</label>
      <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} />
      <label className="text-sm">
        {intl.get('bank_api.import.account_number')}
      </label>
      <Input
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <DateField value={from} onChange={setFrom} className="rounded border px-2 py-1 text-sm" />
        <span className="text-muted-foreground">—</span>
        <DateField value={to} onChange={setTo} className="rounded border px-2 py-1 text-sm" />
      </div>
      <div className="flex justify-end">
        <Button
          onClick={handleImport}
          disabled={!accountId || !accountNumber || importStmt.isLoading}
        >
          {intl.get('bank_api.action.import')}
        </Button>
      </div>
    </div>
  );
}
