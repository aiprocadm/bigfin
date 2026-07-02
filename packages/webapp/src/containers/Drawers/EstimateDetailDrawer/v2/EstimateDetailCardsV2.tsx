import { ComponentType, ReactNode } from 'react';
import intl from 'react-intl-universal';

import { Card } from '@/components/ui/card';
import { DRAWERS } from '@/constants/drawers';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useCurrentOrganization } from '@/hooks/state/organizations';
import { compose } from '@/utils';

import type { EstimateDetail, EstimateEntry } from './types';

const EMPTY_VALUE = '—';

// withDrawerActions — легаси-HOC без типов: описываем инжектируемые
// пропсы локально, не трогая общий модуль.
interface WithDrawerActionsProps {
  openDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

// useCurrentOrganization — легаси-хук без типов, кастуем результат локально.
type CurrentOrganization = { base_currency?: string } | undefined;

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

/** Строка итогов под таблицей позиций. */
function TotalRow({
  label,
  value,
  emphasized,
}: {
  label: string;
  value?: string;
  emphasized?: boolean;
}) {
  return (
    <div
      className={
        emphasized
          ? 'flex items-baseline justify-between gap-4 border-t border-border py-2 text-sm font-semibold text-text-primary'
          : 'flex items-baseline justify-between gap-4 border-t border-border py-2 text-sm text-text-secondary first:border-t-0'
      }
    >
      <dt className="shrink-0">{label}</dt>
      <dd className="m-0 text-right tabular-nums text-text-primary">
        {value || EMPTY_VALUE}
      </dd>
    </div>
  );
}

/**
 * Карточки деталей сметы: сумма и реквизиты документа, таблица позиций
 * с итогами (деньги — tabular-nums), условия и примечание.
 */
function EstimateDetailCardsV2Root({
  estimate,
  openDrawer,
}: {
  estimate: EstimateDetail;
} & WithDrawerActionsProps) {
  const organization = useCurrentOrganization() as CurrentOrganization;

  const entries: EstimateEntry[] = estimate.entries ?? [];
  // Как в легаси: колонку скидки показываем, только если она хоть где-то есть.
  const hasDiscountColumn = entries.some((entry) => entry.discount_formatted);

  // Ссылка на клиента открывает его drawer поверх текущего (паритет
  // с легаси CustomerDrawerLink).
  const handleOpenCustomer = () => {
    if (estimate.customer_id != null) {
      openDrawer(DRAWERS.CUSTOMER_DETAILS, { customerId: estimate.customer_id });
    }
  };

  const showExchangeRate = Boolean(
    estimate.currency_code &&
      organization?.base_currency &&
      estimate.currency_code !== organization.base_currency,
  );

  const discountTotalLabel = estimate.discount_percentage_formatted
    ? intl.get('estimate.drawer.label.discount_with_percent', {
        percent: estimate.discount_percentage_formatted,
      })
    : intl.get('estimate.drawer.label.discount');

  return (
    <>
      {/* Сумма крупно + реквизиты документа волосяными строками. */}
      <Card className="p-4 sm:p-5">
        <div className="text-sm text-text-secondary">{intl.get('amount')}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
          {estimate.total_formatted || EMPTY_VALUE}
        </div>

        <dl className="m-0 mt-4">
          <DetailRow label={intl.get('estimate.details.estimate_number')}>
            {estimate.estimate_number || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('customer_name')}>
            {estimate.customer?.display_name ? (
              <button
                type="button"
                onClick={handleOpenCustomer}
                className="text-sm text-text-primary underline decoration-border underline-offset-2 transition-colors hover:decoration-text-primary"
              >
                {estimate.customer.display_name}
              </button>
            ) : (
              EMPTY_VALUE
            )}
          </DetailRow>
          <DetailRow label={intl.get('estimate_date')}>
            {estimate.formatted_estimate_date || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('expiration_date')}>
            {estimate.formatted_expiration_date || EMPTY_VALUE}
          </DetailRow>
          {showExchangeRate ? (
            <DetailRow label={intl.get('exchange_rate')}>
              <span className="tabular-nums">
                1 {organization?.base_currency} = {estimate.exchange_rate}{' '}
                {estimate.currency_code}
              </span>
            </DetailRow>
          ) : null}
          <DetailRow label={intl.get('reference')}>
            {estimate.reference || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('estimate.details.created_at')}>
            {estimate.formatted_created_at || EMPTY_VALUE}
          </DetailRow>
        </dl>
      </Card>

      {/* Позиции сметы + итоги. */}
      <Card className="p-4 sm:p-5">
        <CardTitleSm>{intl.get('estimate.drawer.section.items')}</CardTitleSm>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-text-muted">
                <th className="py-2 pr-3 text-left font-medium">
                  {intl.get('product_and_service')}
                </th>
                <th className="py-2 pr-3 text-left font-medium">
                  {intl.get('description')}
                </th>
                <th className="py-2 pr-3 text-right font-medium">
                  {intl.get('quantity')}
                </th>
                <th className="py-2 pr-3 text-right font-medium">
                  {intl.get('rate')}
                </th>
                {hasDiscountColumn ? (
                  <th className="py-2 pr-3 text-right font-medium">
                    {intl.get('estimate.drawer.label.discount')}
                  </th>
                ) : null}
                <th className="py-2 text-right font-medium">
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
                  <td className="py-2.5 pr-3 align-top text-text-primary">
                    {entry.item?.name || EMPTY_VALUE}
                  </td>
                  <td className="py-2.5 pr-3 align-top text-text-secondary">
                    {entry.description || EMPTY_VALUE}
                  </td>
                  <td className="py-2.5 pr-3 text-right align-top tabular-nums text-text-primary">
                    {entry.quantity_formatted || EMPTY_VALUE}
                  </td>
                  <td className="py-2.5 pr-3 text-right align-top tabular-nums text-text-primary">
                    {entry.rate_formatted || EMPTY_VALUE}
                  </td>
                  {hasDiscountColumn ? (
                    <td className="py-2.5 pr-3 text-right align-top tabular-nums text-text-primary">
                      {entry.discount_formatted || EMPTY_VALUE}
                    </td>
                  ) : null}
                  <td className="py-2.5 text-right align-top tabular-nums text-text-primary">
                    {entry.total_formatted || EMPTY_VALUE}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="m-0 ml-auto mt-4 w-full max-w-xs">
          <TotalRow
            label={intl.get('estimate.details.subtotal')}
            value={estimate.formatted_subtotal}
          />
          {estimate.discount_amount_formatted ? (
            <TotalRow
              label={discountTotalLabel}
              value={estimate.discount_amount_formatted}
            />
          ) : null}
          {estimate.adjustment_formatted ? (
            <TotalRow
              label={intl.get('adjustment')}
              value={estimate.adjustment_formatted}
            />
          ) : null}
          <TotalRow
            label={intl.get('estimate.details.total')}
            value={estimate.total_formatted}
            emphasized
          />
        </dl>
      </Card>

      {/* Условия и примечание — только если заполнены. */}
      {estimate.terms_conditions || estimate.note ? (
        <Card className="flex flex-col gap-4 p-4 sm:p-5">
          {estimate.terms_conditions ? (
            <div>
              <CardTitleSm>
                {intl.get('estimate.details.terms_conditions')}
              </CardTitleSm>
              <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">
                {estimate.terms_conditions}
              </p>
            </div>
          ) : null}
          {estimate.note ? (
            <div>
              <CardTitleSm>{intl.get('estimate.details.note')}</CardTitleSm>
              <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">
                {estimate.note}
              </p>
            </div>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}

export const EstimateDetailCardsV2 = compose(withDrawerActions)(
  EstimateDetailCardsV2Root,
) as ComponentType<{ estimate: EstimateDetail }>;
