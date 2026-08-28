// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';

import { useAccounts } from '@/hooks/query/accounts';
import { ACCOUNT_TYPE } from '@/constants/accountTypes';

/** Денежные счета — из них платят и на них получают. */
const CASH_TYPES: string[] = [ACCOUNT_TYPE.CASH, ACCOUNT_TYPE.BANK];

interface CashAccountFieldProps {
  /** Выбранный счёт: внутренний номер строкой ('' — ничего не выбрано). */
  value: string;
  onChange: (accountId: string) => void;
  className?: string;
  'aria-label'?: string;
}

/**
 * П2 карты v36. Выбор денежного счёта из списка.
 *
 * Экраны интеграций просили «ID денежного счёта Bigfin» строкой ввода.
 * Это внутренний номер: в интерфейсе он нигде не показан, взять его
 * человеку неоткуда. Счёт выбирается по названию — как везде в продукте.
 */
export function CashAccountField({
  value,
  onChange,
  className,
  ...rest
}: CashAccountFieldProps) {
  const { data: accounts } = useAccounts({}, {});

  const cashAccounts = React.useMemo(
    () =>
      ((accounts ?? []) as any[]).filter(
        (account) =>
          CASH_TYPES.includes(account.accountType ?? account.account_type) &&
          account.active !== false,
      ),
    [accounts],
  );

  return (
    <select
      className={
        className ??
        'border-input bg-background h-9 rounded-md border px-3 text-sm'
      }
      value={value}
      onChange={(event) => onChange(event.target.value)}
      {...rest}
    >
      <option value="">{intl.get('cash_account_field.placeholder')}</option>
      {cashAccounts.map((account) => (
        <option key={account.id} value={String(account.id)}>
          {account.code ? `${account.code} — ${account.name}` : account.name}
        </option>
      ))}
    </select>
  );
}
