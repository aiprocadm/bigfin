import { ReactNode } from 'react';
import intl from 'react-intl-universal';

import { Card } from '@/components/ui/card';

import type { VendorCreditDetail, VendorCreditEntry } from './types';

const EMPTY_VALUE = '—';

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

const hasDiscount = (entries: VendorCreditEntry[]) =>
  entries.some((entry) => entry.discount_formatted);

/**
 * Вкладка «Детали» возврата поставщику: сумма + реквизиты, позиции.
 */
export function VendorCreditDetailOverviewTabV2({
  vendorCredit,
}: {
  vendorCredit: VendorCreditDetail;
}) {
  const entries = vendorCredit.entries ?? [];
  const showDiscount = hasDiscount(entries);

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 sm:p-5">
        <div className="text-sm text-text-secondary">{intl.get('amount')}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
          {vendorCredit.total_formatted || EMPTY_VALUE}
        </div>

        <dl className="m-0 mt-4">
          <DetailRow
            label={intl.get('vendor_credit.drawer.label_vendor_credit_date')}
          >
            {vendorCredit.formatted_vendor_credit_date || EMPTY_VALUE}
          </DetailRow>
          <DetailRow
            label={intl.get('vendor_credit.drawer.label_vendor_credit_no')}
          >
            {vendorCredit.vendor_credit_number || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('vendor_name')}>
            {vendorCredit.vendor?.display_name || EMPTY_VALUE}
          </DetailRow>
          <DetailRow
            label={intl.get('vendor_credit.drawer.label_credits_remaining')}
          >
            <span className="tabular-nums">
              {vendorCredit.formatted_credits_remaining || EMPTY_VALUE}
            </span>
          </DetailRow>
          <DetailRow label={intl.get('reference')}>
            {vendorCredit.reference_no || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('vendor_credit.drawer.label_created_at')}>
            {vendorCredit.formatted_created_at || EMPTY_VALUE}
          </DetailRow>
        </dl>
      </Card>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-surface-elevated">
              <tr className="text-[0.8125rem] font-medium text-text-secondary">
                <th className="px-3 py-2 text-left">
                  {intl.get('product_and_service')}
                </th>
                <th className="px-3 py-2 text-left">
                  {intl.get('description')}
                </th>
                <th className="px-3 py-2 text-right">{intl.get('quantity')}</th>
                <th className="px-3 py-2 text-right">{intl.get('rate')}</th>
                {showDiscount ? (
                  <th className="px-3 py-2 text-right">
                    {intl.get('discount')}
                  </th>
                ) : null}
                <th className="px-3 py-2 text-right">{intl.get('amount')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={index} className="border-t border-border">
                  <td className="px-3 py-2">{entry.item?.name}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {entry.description}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {entry.quantity_formatted}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {entry.rate_formatted}
                  </td>
                  {showDiscount ? (
                    <td className="px-3 py-2 text-right tabular-nums">
                      {entry.discount_formatted}
                    </td>
                  ) : null}
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {entry.total_formatted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
