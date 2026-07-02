import { ComponentType, ReactNode, useMemo, useState } from 'react';
import intl from 'react-intl-universal';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DRAWERS } from '@/constants/drawers';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import type { AccountDetail, AccountTransaction } from './types';

const EMPTY_VALUE = '—';

/** Строка «подпись — значение» с волосяным разделителем. */
function DetailRow({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-border py-2.5 first:border-t-0 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-sm text-text-muted">{label}</dt>
      <dd className="m-0 text-right text-sm text-text-primary">
        {children ?? EMPTY_VALUE}
      </dd>
    </div>
  );
}

/** Заголовок карточки — маленький, вторичный (воздух вместо линий). */
function CardTitleSm({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-medium text-text-secondary">{children}</h3>
  );
}

/** Режим отображения сумм: в валюте счёта (FCY) или базовой (BCY) — как в легаси. */
type CurrencyMode = 'fcy' | 'bcy';

interface AccountDetailsCardsV2Props {
  account: AccountDetail;
  transactions: AccountTransaction[];
}

// withDrawerActions — легаси-HOC (@ts подавлен в модуле): описываем
// инжектируемые пропсы локально, не трогая общий модуль.
interface WithDrawerActionsProps {
  closeDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

/**
 * Карточки данных счёта: баланс с реквизитами (деньги — tabular-nums),
 * описание (если заполнено) и последние операции с переключателем валюты.
 * Пустые значения — спокойное «—».
 */
function AccountDetailsCardsV2Root({
  account,
  transactions,
  closeDrawer,
}: AccountDetailsCardsV2Props & WithDrawerActionsProps) {
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('fcy');
  const isFcy = currencyMode === 'fcy';

  // В ответе нет уникального id строки — даём стабильный локальный id.
  const rows = useMemo(
    () =>
      transactions.map((transaction, index) => ({
        ...transaction,
        __rowId: String(index),
      })),
    [transactions],
  );

  const columns = useMemo(
    () => [
      {
        id: 'date',
        Header: intl.get('transaction_date'),
        accessor: 'formatted_date',
        width: 110,
      },
      {
        id: 'type',
        Header: intl.get('transaction_type'),
        accessor: 'transaction_type_formatted',
        width: 100,
      },
      {
        id: 'debit',
        Header: intl.get('debit'),
        accessor: isFcy ? 'formatted_fc_debit' : 'formatted_debit',
        width: 80,
        align: 'right',
      },
      {
        id: 'credit',
        Header: intl.get('credit'),
        accessor: isFcy ? 'formatted_fc_credit' : 'formatted_credit',
        width: 80,
        align: 'right',
      },
    ],
    [isFcy],
  );

  // Ссылка «показать ещё» ведёт в главную книгу и закрывает drawer (как легаси).
  const handleViewMoreClick = () => {
    closeDrawer(DRAWERS.ACCOUNT_DETAILS);
  };

  return (
    <>
      {/* Баланс: главное число крупно, реквизиты — волосяными строками. */}
      <Card className="p-4 sm:p-5">
        <div className="text-sm text-text-secondary">
          {intl.get('closing_balance')}
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
          {account.formatted_amount || EMPTY_VALUE}
        </div>

        <dl className="m-0 mt-4">
          <DetailRow label={intl.get('account_type')}>
            {account.account_type_label || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('account_normal')}>
            {account.account_normal_formatted ? (
              <span className="inline-flex items-center gap-1">
                {account.account_normal_formatted}
                {account.account_normal === 'credit' ? (
                  <ArrowDown
                    className="h-3.5 w-3.5 text-text-muted"
                    aria-hidden
                  />
                ) : (
                  <ArrowUp className="h-3.5 w-3.5 text-text-muted" aria-hidden />
                )}
              </span>
            ) : (
              EMPTY_VALUE
            )}
          </DetailRow>
          <DetailRow label={intl.get('code')}>
            <span className="tabular-nums">{account.code || EMPTY_VALUE}</span>
          </DetailRow>
          <DetailRow label={intl.get('currency')}>
            {account.currency_code || EMPTY_VALUE}
          </DetailRow>
        </dl>
      </Card>

      {/* Описание — только если заполнено. */}
      {account.description ? (
        <Card className="p-4 sm:p-5">
          <CardTitleSm>{intl.get('description')}</CardTitleSm>
          <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">
            {account.description}
          </p>
        </Card>
      ) : null}

      {/* Операции по счёту: переключатель валюты + компактная таблица. */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitleSm>{intl.get('transactions')}</CardTitleSm>

          <Tabs
            value={currencyMode}
            onValueChange={(value) => setCurrencyMode(value as CurrencyMode)}
          >
            <TabsList className="h-8 p-0.5">
              <TabsTrigger value="fcy" className="px-2.5 py-1 text-xs">
                {intl.get('account.drawer.currency_mode.fcy')}
              </TabsTrigger>
              <TabsTrigger value="bcy" className="px-2.5 py-1 text-xs">
                {intl.get('account.drawer.currency_mode.bcy')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="mt-3">
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(row: { __rowId: string }) => row.__rowId}
            emptyState={
              <p className="py-6 text-center text-sm text-text-muted">
                {intl.get('account.drawer.empty_transactions')}
              </p>
            }
          />
        </div>

        {rows.length > 0 ? (
          <div className="mt-3 text-sm">
            <Link
              to="/financial-reports/general-ledger"
              onClick={handleViewMoreClick}
              className="text-action underline-offset-4 hover:underline"
            >
              {intl.get('view_more_transactions')}
            </Link>
          </div>
        ) : null}
      </Card>
    </>
  );
}

export const AccountDetailsCardsV2 = compose(withDrawerActions)(
  AccountDetailsCardsV2Root,
) as ComponentType<AccountDetailsCardsV2Props>;
