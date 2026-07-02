import { ComponentType, ReactNode, useMemo } from 'react';
import intl from 'react-intl-universal';

import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { DRAWERS } from '@/constants/drawers';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useCurrentOrganization } from '@/hooks/state/organizations';
import { compose } from '@/utils';

import type { PaymentMadeDetail, PaymentMadeEntry } from './types';

const EMPTY_VALUE = '—';

interface PaymentMadeDetailCardsV2Props {
  paymentMade: PaymentMadeDetail;
}

// Легаси-HOC (ts-nocheck) не экспортирует типы инжектируемых пропсов —
// описываем локально, не трогая общий модуль.
interface WithDrawerActionsProps {
  openDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

// useCurrentOrganization — легаси-хук без типов, кастуем результат локально.
interface CurrentOrganization {
  base_currency?: string;
}

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

/** Строка таблицы оплаченных счетов (стабильный id для DataTable). */
type PaymentEntryRow = PaymentMadeEntry & { __id: string };

/**
 * Карточки деталей исходящего платежа: сумма (деньги — tabular-nums)
 * с реквизитами, таблица оплаченных счетов с итогами, назначение платежа.
 * Пустые значения — спокойное «—».
 */
function PaymentMadeDetailCardsV2Root({
  paymentMade,
  openDrawer,
}: PaymentMadeDetailCardsV2Props & WithDrawerActionsProps) {
  const organization = useCurrentOrganization() as CurrentOrganization;
  const baseCurrency = organization?.base_currency;

  // Курс показываем только для платежа в чужой валюте (как в легаси).
  const showExchangeRate = Boolean(
    paymentMade.currency_code &&
      baseCurrency &&
      paymentMade.currency_code !== baseCurrency,
  );

  // Открыть drawer поставщика (механизм прежний: redux openDrawer).
  const handleVendorClick = () => {
    if (paymentMade.vendor_id != null) {
      openDrawer(DRAWERS.VENDOR_DETAILS, { vendorId: paymentMade.vendor_id });
    }
  };

  const entryRows = useMemo<PaymentEntryRow[]>(
    () =>
      (paymentMade.entries ?? []).map((entry, index) => ({
        ...entry,
        __id: String(entry.id ?? `${entry.bill_id ?? 'entry'}-${index}`),
      })),
    [paymentMade.entries],
  );

  const entryColumns = useMemo(
    () => [
      {
        id: 'bill_date',
        Header: intl.get('date'),
        accessor: 'bill.formatted_bill_date',
        disableSortBy: true,
      },
      {
        id: 'bill_number',
        Header: intl.get('bill_number'),
        // Номер счёта: из связанного счёта, с легаси-фолбэком на строку.
        accessor: (row: PaymentEntryRow) =>
          row.bill?.bill_number ?? row.bill_no ?? EMPTY_VALUE,
        disableSortBy: true,
      },
      {
        id: 'bill_amount',
        Header: intl.get('bill_amount'),
        accessor: (row: PaymentEntryRow) =>
          row.bill?.formatted_amount ?? EMPTY_VALUE,
        align: 'right',
        disableSortBy: true,
      },
      {
        id: 'due_amount',
        Header: intl.get('due_amount'),
        accessor: (row: PaymentEntryRow) =>
          row.bill?.formatted_due_amount ?? EMPTY_VALUE,
        align: 'right',
        disableSortBy: true,
      },
      {
        id: 'payment_amount',
        Header: intl.get('payment_amount'),
        accessor: (row: PaymentEntryRow) =>
          row.payment_amount_formatted ?? EMPTY_VALUE,
        align: 'right',
        disableSortBy: true,
      },
    ],
    [],
  );

  return (
    <>
      {/* Сумма платежа: главное число крупно, реквизиты — волосяными строками. */}
      <Card className="p-4 sm:p-5">
        <div className="text-sm text-text-secondary">{intl.get('amount')}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
          {paymentMade.formatted_amount || EMPTY_VALUE}
        </div>

        <dl className="m-0 mt-4">
          <DetailRow label={intl.get('payment_date')}>
            {paymentMade.formatted_payment_date || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('payment_made.details.payment_number')}>
            {paymentMade.payment_number || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('vendor_name')}>
            {paymentMade.vendor?.display_name ? (
              <button
                type="button"
                onClick={handleVendorClick}
                className="cursor-pointer text-sm font-medium text-text-primary underline decoration-border underline-offset-2 hover:decoration-text-primary"
              >
                {paymentMade.vendor?.display_name}
              </button>
            ) : (
              EMPTY_VALUE
            )}
          </DetailRow>
          <DetailRow label={intl.get('payment_account')}>
            {paymentMade.payment_account?.name || EMPTY_VALUE}
          </DetailRow>
          {showExchangeRate ? (
            <DetailRow label={intl.get('exchange_rate')}>
              <span className="tabular-nums">
                1 {baseCurrency} = {paymentMade.exchange_rate}{' '}
                {paymentMade.currency_code}
              </span>
            </DetailRow>
          ) : null}
          <DetailRow label={intl.get('reference')}>
            {paymentMade.reference || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('created_at')}>
            {paymentMade.formatted_created_at || EMPTY_VALUE}
          </DetailRow>
        </dl>
      </Card>

      {/* Оплаченные счета + итоги. */}
      <Card className="p-4 sm:p-5">
        <CardTitleSm>
          {intl.get('payment_made.drawer.section.applied_bills')}
        </CardTitleSm>

        <div className="mt-3">
          <DataTable
            columns={entryColumns}
            data={entryRows}
            getRowId={(row: PaymentEntryRow) => row.__id}
          />
        </div>

        <div className="ml-auto mt-3 w-full max-w-xs">
          <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
            <span className="text-text-muted">
              {intl.get('payment_made.details.subtotal')}
            </span>
            <span className="tabular-nums text-text-primary">
              {paymentMade.formatted_subtotal || EMPTY_VALUE}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-border py-2 text-sm font-semibold">
            <span className="text-text-primary">
              {intl.get('payment_made.details.total')}
            </span>
            <span className="tabular-nums text-text-primary">
              {paymentMade.formatted_total ||
                paymentMade.formatted_amount ||
                EMPTY_VALUE}
            </span>
          </div>
        </div>
      </Card>

      {/* Назначение платежа — только если заполнено. */}
      {paymentMade.statement ? (
        <Card className="p-4 sm:p-5">
          <CardTitleSm>
            {intl.get('payment_made.details.statement')}
          </CardTitleSm>
          <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">
            {paymentMade.statement}
          </p>
        </Card>
      ) : null}
    </>
  );
}

export const PaymentMadeDetailCardsV2 = compose(withDrawerActions)(
  PaymentMadeDetailCardsV2Root,
) as ComponentType<PaymentMadeDetailCardsV2Props>;
