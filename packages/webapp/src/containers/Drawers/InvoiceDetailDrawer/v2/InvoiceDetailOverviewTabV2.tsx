import { ComponentType, ReactNode, useMemo } from 'react';
import intl from 'react-intl-universal';

import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { DRAWERS } from '@/constants/drawers';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useCurrentOrganization } from '@/hooks/state';
import { compose } from '@/utils';

import type { InvoiceDetail, InvoiceEntry } from './types';

const EMPTY_VALUE = '—';

interface InvoiceDetailOverviewTabV2Props {
  invoice: InvoiceDetail;
}

// withDrawerActions — легаси-HOC без типов: описываем инжектируемые
// пропсы локально.
interface WithDrawerActionsProps {
  openDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

/** Строка «подпись — значение» с волосяным разделителем. */
function DetailRow({
  label,
  children,
}: {
  label: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-border py-2.5 first:border-t-0 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-sm text-text-muted">{label}</dt>
      <dd className="m-0 text-right text-sm text-text-primary">
        {children ?? EMPTY_VALUE}
      </dd>
    </div>
  );
}

/** Строка итогов под таблицей позиций. */
function TotalRow({
  label,
  value,
  strong,
}: {
  label: string;
  value?: string | null;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-border py-2 first:border-t-0 first:pt-0">
      <span
        className={
          strong
            ? 'text-sm font-semibold text-text-primary'
            : 'text-sm text-text-secondary'
        }
      >
        {label}
      </span>
      <span
        className={
          strong
            ? 'text-sm font-semibold tabular-nums text-text-primary'
            : 'text-sm tabular-nums text-text-primary'
        }
      >
        {value || EMPTY_VALUE}
      </span>
    </div>
  );
}

type InvoiceEntryRow = InvoiceEntry & { __rowId: string };

const getEntryRowId = (row: InvoiceEntryRow) => row.__rowId;

/** Колонки read-only таблицы позиций (react-table v7 формат). */
function useInvoiceEntriesColumnsV2(showDiscount: boolean) {
  return useMemo(() => {
    const columns: Record<string, unknown>[] = [
      {
        id: 'item',
        Header: intl.get('product_and_service'),
        width: 150,
        Cell: ({ row }: { row: { original: InvoiceEntryRow } }) => (
          <span className="font-medium">
            {row.original.item?.name || EMPTY_VALUE}
          </span>
        ),
      },
      {
        id: 'description',
        Header: intl.get('description'),
        Cell: ({ row }: { row: { original: InvoiceEntryRow } }) => (
          <span className="text-text-secondary">
            {row.original.description || EMPTY_VALUE}
          </span>
        ),
      },
      {
        id: 'quantity',
        Header: intl.get('quantity'),
        accessor: 'quantity_formatted',
        align: 'right',
        width: 80,
      },
      {
        id: 'rate',
        Header: intl.get('rate'),
        accessor: 'rate_formatted',
        align: 'right',
        width: 90,
      },
    ];
    if (showDiscount) {
      columns.push({
        id: 'discount',
        Header: intl.get('invoice_form.label.discount'),
        accessor: 'discount_formatted',
        align: 'right',
        width: 90,
      });
    }
    columns.push({
      id: 'amount',
      Header: intl.get('amount'),
      align: 'right',
      width: 110,
      Cell: ({ row }: { row: { original: InvoiceEntryRow } }) => (
        <span className="font-medium">{row.original.total_formatted}</span>
      ),
    });
    return columns;
  }, [showDiscount]);
}

/**
 * Вкладка «Обзор»: карточка суммы и реквизитов, таблица позиций
 * с итогами, условия и сообщение счёта. Деньги — tabular-nums,
 * пусто — спокойное «—».
 */
function InvoiceDetailOverviewTabV2Root({
  invoice,
  openDrawer,
}: InvoiceDetailOverviewTabV2Props & WithDrawerActionsProps) {
  const organization = useCurrentOrganization() as
    | { base_currency?: string }
    | undefined;
  const baseCurrency = organization?.base_currency;

  const entries = invoice.entries ?? [];
  const entryRows = useMemo<InvoiceEntryRow[]>(
    () =>
      entries.map((entry, index) => ({
        ...entry,
        __rowId: entry.id != null ? String(entry.id) : `row-${index}`,
      })),
    [entries],
  );
  // Как в легаси: колонка скидки видна, только если она есть хоть в одной строке.
  const showDiscount = entries.some((entry) => entry.discount_formatted);
  const columns = useInvoiceEntriesColumnsV2(showDiscount);

  // Курс валюты показываем только для валютных счетов (как легаси
  // ExchangeRateDetailItem).
  const isForeignCurrency = Boolean(
    invoice.currency_code &&
      baseCurrency &&
      invoice.currency_code !== baseCurrency,
  );

  const handleCustomerClick = () => {
    openDrawer(DRAWERS.CUSTOMER_DETAILS, { customerId: invoice.customer_id });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Сумма и реквизиты: главное число крупно, детали — волосяными строками. */}
      <Card className="p-4 sm:p-5">
        <div className="text-sm text-text-secondary">{intl.get('amount')}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
          {invoice.total_formatted || EMPTY_VALUE}
        </div>

        <dl className="m-0 mt-4">
          <DetailRow label={intl.get('due_amount')}>
            <span className="font-semibold tabular-nums">
              {invoice.due_amount_formatted || EMPTY_VALUE}
            </span>
          </DetailRow>
          <DetailRow label={intl.get('invoice_date')}>
            {invoice.invoice_date_formatted || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('due_date')}>
            {invoice.due_date_formatted || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('customer_name')}>
            {invoice.customer?.display_name ? (
              <button
                type="button"
                className="text-action underline-offset-4 hover:underline"
                onClick={handleCustomerClick}
              >
                {invoice.customer.display_name}
              </button>
            ) : (
              EMPTY_VALUE
            )}
          </DetailRow>
          <DetailRow label={intl.get('invoice.details.invoice_no')}>
            {invoice.invoice_no || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('reference')}>
            {invoice.reference_no || EMPTY_VALUE}
          </DetailRow>
          {isForeignCurrency ? (
            <DetailRow label={intl.get('exchange_rate')}>
              <span className="tabular-nums">
                1 {baseCurrency} = {invoice.exchange_rate}{' '}
                {invoice.currency_code}
              </span>
            </DetailRow>
          ) : null}
          <DetailRow label={intl.get('invoice.details.created_at')}>
            {invoice.created_at_formatted || EMPTY_VALUE}
          </DetailRow>
        </dl>
      </Card>

      {/* Позиции счёта + итоги (порядок строк — как в легаси-футере). */}
      <Card className="p-4 sm:p-5">
        <DataTable
          columns={columns}
          data={entryRows}
          getRowId={getEntryRowId}
        />

        <div className="ml-auto mt-4 w-full max-w-xs">
          <TotalRow
            label={intl.get('invoice.details.subtotal')}
            value={invoice.subtotal_formatted}
          />
          {(invoice.discount_amount ?? 0) > 0 ? (
            <TotalRow
              label={
                invoice.discount_percentage_formatted
                  ? `${intl.get('invoice_form.label.discount')} [${invoice.discount_percentage_formatted}]`
                  : intl.get('invoice_form.label.discount')
              }
              value={invoice.discount_amount_formatted}
            />
          ) : null}
          {invoice.adjustment_formatted ? (
            <TotalRow
              label={intl.get('adjustment')}
              value={invoice.adjustment_formatted}
            />
          ) : null}
          {(invoice.taxes ?? []).map((taxRate) => (
            <TotalRow
              key={taxRate.id}
              label={`${taxRate.name} [${taxRate.tax_rate}%]`}
              value={taxRate.tax_rate_amount_formatted}
            />
          ))}
          <TotalRow
            label={intl.get('invoice.details.total')}
            value={invoice.total_formatted}
            strong
          />
          <TotalRow
            label={intl.get('invoice.details.payment_amount')}
            value={invoice.payment_amount_formatted}
          />
          <TotalRow
            label={intl.get('invoice.details.due_amount')}
            value={invoice.due_amount_formatted}
            strong
          />
        </div>
      </Card>

      {/* Условия и сообщение — только если заполнены (как легаси-футер). */}
      {invoice.terms_conditions ? (
        <Card className="p-4 sm:p-5">
          <h3 className="text-sm font-medium text-text-secondary">
            {intl.get('terms_conditions')}
          </h3>
          <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">
            {invoice.terms_conditions}
          </p>
        </Card>
      ) : null}

      {invoice.invoice_message ? (
        <Card className="p-4 sm:p-5">
          <h3 className="text-sm font-medium text-text-secondary">
            {intl.get('invoice.details.invoice_message')}
          </h3>
          <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">
            {invoice.invoice_message}
          </p>
        </Card>
      ) : null}
    </div>
  );
}

export const InvoiceDetailOverviewTabV2 = compose(withDrawerActions)(
  InvoiceDetailOverviewTabV2Root,
) as ComponentType<InvoiceDetailOverviewTabV2Props>;
