import React from 'react';
import intl from 'react-intl-universal';
import { Link } from 'react-router-dom';
import { Landmark, PlayCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Can } from '@/components/Dashboard/DashboardAbilityProvider';
import { useDialogActions } from '@/hooks/state';
import { useFeatureCan } from '@/hooks/state/feature';
import { useAuthMetadata } from '@/hooks/query';
import { CashflowAction, AbilitySubject } from '@/constants/abilityOption';
import { ACCOUNT_TYPE, Features } from '@/constants';
import { DialogsName } from '@/constants/dialogs';
import { AccountDialogAction } from '@/containers/Dialogs/AccountDialog/utils';

/**
 * Банки, которые подключаются по API прямо сейчас. Подписи — те же, что в
 * сверке: один банк не должен называться в продукте по-разному.
 */
const API_BANKS = [
  { key: 'tinkoff', labelKey: 'reconciliation.provider.tinkoff' },
  { key: 'alfa', labelKey: 'reconciliation.provider.alfa' },
];

/**
 * Пустой экран «Счета» (FT-095 ТЗ-3).
 *
 * Раньше здесь была одна строка «нет счетов под текущие фильтры» — хотя
 * фильтров человек не ставил, а счетов у него просто ещё нет. Пустой экран
 * — первое, что видит новичок, и он должен отвечать на вопрос «что
 * дальше»: завести счёт, подключить банк или сначала посмотреть, как всё
 * выглядит на готовых данных.
 */
export function CashflowAccountsEmptyState() {
  const { openDialog } = useDialogActions();
  const { featureCan } = useFeatureCan();
  const { data: authMeta } = useAuthMetadata();

  // Каталог банков показываем, только если модуль банков включён: иначе
  // ссылка вела бы на страницу «модуль выключен».
  const canConnectBanks = featureCan(Features.BankApiSync);

  // Тот же вход в демо, что на экране настройки организации: сервер
  // отдаёт поле плоско, и без включённого демо кнопки нет вовсе — иначе
  // она вела бы на закрытую страницу (Д1 карты v18).
  const demoUrl: string | undefined = authMeta?.one_click_demo?.demo_url;
  const showDemo = Boolean(authMeta?.one_click_demo?.enable) && Boolean(demoUrl);

  const addAccount = (accountType: string) =>
    openDialog(DialogsName.AccountForm, {
      action: AccountDialogAction.NewDefinedType,
      accountType,
    });

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 py-8 text-center">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-text-primary">
          {intl.get('cash_flow.accounts.empty_title')}
        </h2>
        <p className="text-sm text-text-secondary">
          {intl.get('cash_flow.accounts.empty_text')}
        </p>
      </div>

      <Can I={CashflowAction.Create} a={AbilitySubject.Cashflow}>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => addAccount(ACCOUNT_TYPE.BANK)}>
            {intl.get('banking.label.add_bank_account')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => addAccount(ACCOUNT_TYPE.CASH)}
          >
            {intl.get('banking.label.add_cash_account')}
          </Button>
        </div>
      </Can>

      <div className="flex flex-col gap-3 rounded-default border border-border bg-surface-elevated p-4 text-left">
        {canConnectBanks && (
          <>
            <p className="text-sm font-medium text-text-primary">
              {intl.get('cash_flow.accounts.bank_catalog_title')}
            </p>
            <div className="flex flex-wrap gap-2">
              {API_BANKS.map((bank) => (
                <Link
                  key={bank.key}
                  to="/bank-api-sync"
                  className="flex min-h-11 items-center gap-2 rounded-control border border-border bg-surface px-3 text-sm text-text-primary hover:bg-surface-elevated sm:min-h-9"
                >
                  <Landmark className="h-4 w-4 text-text-muted" aria-hidden />
                  {intl.get(bank.labelKey)}
                </Link>
              ))}
            </div>
          </>
        )}
        <p className="text-xs text-text-secondary">
          {intl.get('cash_flow.accounts.bank_catalog_other')}
        </p>
      </div>

      {showDemo && (
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => window.open(demoUrl, '_blank', 'noopener')}
          >
            <PlayCircle className="h-4 w-4" aria-hidden />
            {intl.get('cash_flow.accounts.try_demo')}
          </Button>
          <p className="text-xs text-text-muted">
            {intl.get('cash_flow.accounts.try_demo_hint')}
          </p>
        </div>
      )}
    </div>
  );
}
