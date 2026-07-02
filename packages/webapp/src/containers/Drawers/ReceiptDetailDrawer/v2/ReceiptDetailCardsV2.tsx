import { ComponentType, ReactNode } from 'react';
import intl from 'react-intl-universal';

import { Card } from '@/components/ui/card';
import { DRAWERS } from '@/constants/drawers';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useCurrentOrganization } from '@/hooks/state';
import { compose } from '@/utils';

import type { ReceiptDetail, ReceiptEntry } from './types';

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

// withDrawerActions — легаси-HOC без типов, описываем инжект локально.
interface WithDrawerActionsProps {
  openDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

/**
 * Имя клиента как ссылка: открывает drawer «Детали клиента» поверх
 * текущего (как легаси CustomerDrawerLink).
 */
function CustomerLinkRoot({
  customerId,
  children,
  openDrawer,
}: {
  customerId?: number;
  children: ReactNode;
} & WithDrawerActionsProps) {
  if (!customerId) {
    return <>{children}</>;
  }
  return (
    <button
      type="button"
      className="cursor-pointer border-0 bg-transparent p-0 text-right text-sm text-text-primary underline decoration-border underline-offset-2 hover:decoration-text-secondary"
      onClick={() => openDrawer(DRAWERS.CUSTOMER_DETAILS, { customerId })}
    >
      {children}
    </button>
  );
}
const CustomerLink = compose(withDrawerActions)(
  CustomerLinkRoot,
) as ComponentType<{
  customerId?: number;
  children: ReactNode;
}>;

/** Ячейка позиций: числовые значения — вправо, tabular-nums. */
function NumCell({ children }: { children?: ReactNode }) {
  return (
    <td className="whitespace-nowrap py-2.5 pl-4 text-right align-top text-sm tabular-nums text-text-primary">
      {children ?? EMPTY_VALUE}
    </td>
  );
}

/** Строка итогов под таблицей позиций. */
function TotalRow({
  label,
  value,
  emphasized,
}: {
  label: string;
  value?: ReactNode;
  emphasized?: boolean;
}) {
  return (
    <div
      className={
        emphasized
          ? 'flex items-baseline justify-between gap-4 border-t border-border py-2.5 text-sm font-semibold text-text-primary'
          : 'flex items-baseline justify-between gap-4 border-t border-border py-2.5 text-sm first:border-t-0 first:pt-0'
      }
    >
      <dt className={emphasized ? 'shrink-0' : 'shrink-0 text-text-muted'}>
        {label}
      </dt>
      <dd className="m-0 text-right tabular-nums">{value ?? EMPTY_VALUE}</dd>
    </div>
  );
}

/**
 * Карточки деталей чека: сумма и реквизиты, позиции с итогами,
 * примечания. Пустые значения — спокойное «—».
 */
export function ReceiptDetailCardsV2({ receipt }: { receipt: ReceiptDetail }) {
  const organization = useCurrentOrganization() as
    | { base_currency?: string }
    | undefined;
  const baseCurrency = organization?.base_currency;

  const entries: ReceiptEntry[] = receipt.entries ?? [];
  // Как в легаси: колонка скидки видна, только если скидка есть хоть в одной позиции.
  const hasDiscountColumn = entries.some((entry) => entry.discount_formatted);
  const hasNotes = Boolean(receipt.statement || receipt.receipt_message);

  // Курс показываем только для валюты, отличной от базовой (как легаси
  // ExchangeRateDetailItem).
  const showExchangeRate = Boolean(
    receipt.currency_code && baseCurrency && receipt.currency_code !== baseCurrency,
  );

  const discountLabel = receipt.discount_percentage_formatted
    ? `${intl.get('receipt.details.discount')} (${receipt.discount_percentage_formatted})`
    : intl.get('receipt.details.discount');

  return (
    <>
      {/* Сумма и реквизиты: главное число крупно, детали — волосяными строками. */}
      <Card className="p-4 sm:p-5">
        <div className="text-sm text-text-secondary">{intl.get('amount')}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
          {receipt.total_formatted || EMPTY_VALUE}
        </div>

        <dl className="m-0 mt-4">
          <DetailRow label={intl.get('receipt.details.receipt_number')}>
            {receipt.receipt_number || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('customer_name')}>
            {receipt.customer?.display_name ? (
              <CustomerLink customerId={receipt.customer_id}>
                {receipt.customer.display_name}
              </CustomerLink>
            ) : (
              EMPTY_VALUE
            )}
          </DetailRow>
          <DetailRow label={intl.get('receipt_date')}>
            {receipt.formatted_receipt_date || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('closed_date')}>
            {receipt.formatted_closed_at_date || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('deposit_account')}>
            {receipt.deposit_account?.name || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('reference')}>
            {receipt.reference_no || EMPTY_VALUE}
          </DetailRow>
          {showExchangeRate ? (
            <DetailRow label={intl.get('exchange_rate')}>
              <span className="tabular-nums">
                1 {baseCurrency} = {receipt.exchange_rate} {receipt.currency_code}
              </span>
            </DetailRow>
          ) : null}
          <DetailRow label={intl.get('receipt.details.created_at')}>
            {receipt.formatted_created_at || EMPTY_VALUE}
          </DetailRow>
        </dl>
      </Card>

      {/* Позиции: таблица с волосяными строками + итоги справа. */}
      <Card className="p-4 sm:p-5">
        <CardTitleSm>{intl.get('product_and_service')}</CardTitleSm>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 text-left text-xs font-medium text-text-muted">
                  {intl.get('product_and_service')}
                </th>
                <th className="py-2 pr-4 text-left text-xs font-medium text-text-muted">
                  {intl.get('description')}
                </th>
                <th className="whitespace-nowrap py-2 pl-4 text-right text-xs font-medium text-text-muted">
                  {intl.get('quantity')}
                </th>
                <th className="whitespace-nowrap py-2 pl-4 text-right text-xs font-medium text-text-muted">
                  {intl.get('rate')}
                </th>
                {hasDiscountColumn ? (
                  <th className="whitespace-nowrap py-2 pl-4 text-right text-xs font-medium text-text-muted">
                    {intl.get('receipt.details.discount')}
                  </th>
                ) : null}
                <th className="whitespace-nowrap py-2 pl-4 text-right text-xs font-medium text-text-muted">
                  {intl.get('amount')}
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr
                  key={entry.id ?? index}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="py-2.5 pr-4 align-top text-sm text-text-primary">
                    {entry.item?.name || EMPTY_VALUE}
                  </td>
                  <td className="max-w-[220px] py-2.5 pr-4 align-top text-sm text-text-secondary">
                    <span className="line-clamp-2">
                      {entry.description || EMPTY_VALUE}
                    </span>
                  </td>
                  <NumCell>{entry.quantity_formatted}</NumCell>
                  <NumCell>{entry.rate_formatted ?? entry.rate}</NumCell>
                  {hasDiscountColumn ? (
                    <NumCell>{entry.discount_formatted}</NumCell>
                  ) : null}
                  <NumCell>{entry.total_formatted ?? entry.amount}</NumCell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Итоги — компактный столбец справа, деньги через tabular-nums. */}
        <dl className="m-0 ml-auto mt-4 w-full max-w-[320px]">
          <TotalRow
            label={intl.get('receipt.details.subtotal')}
            value={receipt.subtotal_formatted}
          />
          {(receipt.discount_amount ?? 0) > 0 ? (
            <TotalRow
              label={discountLabel}
              value={receipt.discount_amount_formatted}
            />
          ) : null}
          {receipt.adjustment_formatted ? (
            <TotalRow
              label={intl.get('adjustment')}
              value={receipt.adjustment_formatted}
            />
          ) : null}
          <TotalRow
            label={intl.get('receipt.details.total')}
            value={receipt.total_formatted}
            emphasized
          />
          <TotalRow
            label={intl.get('receipt.details.payment_amount')}
            value={receipt.paid_formatted}
          />
          <TotalRow label={intl.get('receipt.details.due_amount')} value={'0'} />
        </dl>
      </Card>

      {/* Примечания — только если есть. */}
      {hasNotes ? (
        <Card className="p-4 sm:p-5">
          {receipt.statement ? (
            <div>
              <CardTitleSm>{intl.get('receipt.details.statement')}</CardTitleSm>
              <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">
                {receipt.statement}
              </p>
            </div>
          ) : null}

          {receipt.receipt_message ? (
            <div className={receipt.statement ? 'mt-4' : undefined}>
              <CardTitleSm>
                {intl.get('receipt.details.receipt_message')}
              </CardTitleSm>
              <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">
                {receipt.receipt_message}
              </p>
            </div>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}
