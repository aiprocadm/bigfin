import { ComponentType, ReactNode, useMemo } from 'react';
import intl from 'react-intl-universal';

import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { DRAWERS } from '@/constants/drawers';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useCurrentOrganization } from '@/hooks/state/organizations';
import { compose } from '@/utils';

import type { PaymentReceivedDetail, PaymentReceivedEntry } from './types';

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

interface PaymentReceiveDetailCardsV2Props {
  paymentReceive: PaymentReceivedDetail;
}

// withDrawerActions — легаси-HOC без типов: описываем инжектируемые
// пропсы локально, не трогая общий модуль.
interface WithDrawerActionsProps {
  openDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

// useCurrentOrganization — легаси-хук без типов, кастуем результат локально.
type CurrentOrganization = { base_currency?: string } | undefined;

/** Строка таблицы с гарантированным ключом (у легаси-записей id опционален). */
type EntryRow = PaymentReceivedEntry & { _rowId: string };

/**
 * Карточки деталей поступления оплаты: сумма (крупно, tabular-nums) +
 * реквизиты, таблица оплаченных счетов с итогами, назначение платежа.
 * Пустые значения — спокойное «—».
 */
function PaymentReceiveDetailCardsV2Root({
  paymentReceive,
  openDrawer,
}: PaymentReceiveDetailCardsV2Props & WithDrawerActionsProps) {
  const organization = useCurrentOrganization() as CurrentOrganization;
  const baseCurrency = organization?.base_currency;

  // Курс показываем только для валютных платежей (как легаси
  // ExchangeRateDetailItem): в базовой валюте строка не нужна.
  const isForeignCurrency = Boolean(
    paymentReceive.currency_code &&
      baseCurrency &&
      paymentReceive.currency_code !== baseCurrency,
  );

  // Открыть drawer клиента поверх текущего (как легаси CustomerDrawerLink).
  const handleCustomerClick = () => {
    if (paymentReceive.customer_id) {
      openDrawer(DRAWERS.CUSTOMER_DETAILS, {
        customerId: paymentReceive.customer_id,
      });
    }
  };

  const entryRows = useMemo<EntryRow[]>(
    () =>
      (paymentReceive.entries ?? []).map((entry, index) => ({
        ...entry,
        _rowId: String(entry.id ?? entry.invoice_id ?? index),
      })),
    [paymentReceive.entries],
  );

  const entryColumns = useMemo(
    () => [
      {
        Header: intl.get('date'),
        accessor: 'invoice.invoice_date_formatted',
        disableSortBy: true,
      },
      {
        Header: intl.get('invoice_no'),
        accessor: 'invoice.invoice_no',
        disableSortBy: true,
      },
      {
        Header: intl.get('invoice_amount'),
        accessor: 'invoice.total_formatted',
        align: 'right',
        disableSortBy: true,
      },
      {
        Header: intl.get('amount_due'),
        accessor: 'invoice.due_amount_formatted',
        align: 'right',
        disableSortBy: true,
      },
      {
        Header: intl.get('payment_amount'),
        accessor: 'payment_amount_formatted',
        align: 'right',
        disableSortBy: true,
      },
    ],
    [],
  );

  return (
    <>
      {/* Сумма и реквизиты: главное число крупно, детали — волосяными строками. */}
      <Card className="p-4 sm:p-5">
        <div className="text-sm text-text-secondary">{intl.get('amount')}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
          {paymentReceive.formatted_amount || EMPTY_VALUE}
        </div>

        <dl className="m-0 mt-4">
          <DetailRow label={intl.get('payment_date')}>
            {paymentReceive.formatted_payment_date || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('payment_receive.details.payment_number')}>
            {paymentReceive.payment_receive_no || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('customer_name')}>
            {paymentReceive.customer?.display_name ? (
              <button
                type="button"
                onClick={handleCustomerClick}
                className="cursor-pointer border-0 bg-transparent p-0 text-right text-sm text-text-primary underline underline-offset-2 hover:text-text-secondary"
              >
                {paymentReceive.customer.display_name}
              </button>
            ) : (
              EMPTY_VALUE
            )}
          </DetailRow>
          <DetailRow label={intl.get('deposit_account')}>
            {paymentReceive.deposit_account?.name || EMPTY_VALUE}
          </DetailRow>
          {isForeignCurrency ? (
            <DetailRow label={intl.get('exchange_rate')}>
              <span className="tabular-nums">
                1 {baseCurrency} = {paymentReceive.exchange_rate}{' '}
                {paymentReceive.currency_code}
              </span>
            </DetailRow>
          ) : null}
          <DetailRow label={intl.get('reference')}>
            {paymentReceive.reference_no || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('created_at')}>
            {paymentReceive.formatted_created_at || EMPTY_VALUE}
          </DetailRow>
        </dl>
      </Card>

      {/* Оплаченные счета: таблица + итоги справа. */}
      {entryRows.length ? (
        <Card className="p-4 sm:p-5">
          <CardTitleSm>
            {intl.get('payment_received.drawer.section.applied_invoices')}
          </CardTitleSm>

          <div className="mt-3">
            <DataTable
              columns={entryColumns}
              data={entryRows}
              getRowId={(row: EntryRow) => row._rowId}
            />
          </div>

          <dl className="m-0 ml-auto mt-4 w-full max-w-xs">
            <DetailRow label={intl.get('payment_receive.details.subtotal')}>
              <span className="tabular-nums">
                {paymentReceive.subtotal_formatted || EMPTY_VALUE}
              </span>
            </DetailRow>
            <div className="flex items-baseline justify-between gap-4 border-t border-border py-2.5 last:pb-0">
              <dt className="shrink-0 text-sm font-semibold text-text-primary">
                {intl.get('payment_receive.details.total')}
              </dt>
              <dd className="m-0 text-right text-sm font-semibold tabular-nums text-text-primary">
                {paymentReceive.formatted_amount || EMPTY_VALUE}
              </dd>
            </div>
          </dl>
        </Card>
      ) : null}

      {/* Назначение платежа — только если есть. */}
      {paymentReceive.statement ? (
        <Card className="p-4 sm:p-5">
          <CardTitleSm>
            {intl.get('payment_receive.details.statement')}
          </CardTitleSm>
          <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">
            {paymentReceive.statement}
          </p>
        </Card>
      ) : null}
    </>
  );
}

export const PaymentReceiveDetailCardsV2 = compose(withDrawerActions)(
  PaymentReceiveDetailCardsV2Root,
) as ComponentType<PaymentReceiveDetailCardsV2Props>;
