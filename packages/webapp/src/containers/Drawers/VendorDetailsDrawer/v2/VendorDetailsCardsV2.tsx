import { ReactNode } from 'react';
import intl from 'react-intl-universal';

import { Card } from '@/components/ui/card';

import type { VendorAddress, VendorDetail } from './types';

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

/** Строки адреса без пустот: улица, дом → город, индекс → страна → телефон. */
function addressLines(address: VendorAddress): string[] {
  const cityLine = [address.city, address.state, address.postcode]
    .filter(Boolean)
    .join(', ');

  return [
    address.address1,
    address.address2,
    cityLine,
    address.country,
    address.phone,
  ].filter((line): line is string => Boolean(line && line.trim()));
}

function AddressBlock({ title, address }: { title: string; address: VendorAddress }) {
  const lines = addressLines(address);

  return (
    <div className="min-w-0">
      <h4 className="text-sm text-text-muted">{title}</h4>
      {lines.length ? (
        <div className="mt-1.5 flex flex-col gap-0.5 text-sm text-text-primary">
          {lines.map((line, index) => (
            <span key={index}>{line}</span>
          ))}
        </div>
      ) : (
        <div className="mt-1.5 text-sm text-text-primary">{EMPTY_VALUE}</div>
      )}
    </div>
  );
}

/**
 * Карточки данных поставщика: задолженность (деньги — tabular-nums),
 * контакты, адреса, примечание. Пустые значения — спокойное «—».
 */
export function VendorDetailsCardsV2({ vendor }: { vendor: VendorDetail }) {
  const billingAddress: VendorAddress = {
    address1: vendor.billing_address1,
    address2: vendor.billing_address2,
    city: vendor.billing_address_city,
    state: vendor.billing_address_state,
    postcode: vendor.billing_address_postcode,
    country: vendor.billing_address_country,
    phone: vendor.billing_address_phone,
  };
  const shippingAddress: VendorAddress = {
    address1: vendor.shipping_address1,
    address2: vendor.shipping_address2,
    city: vendor.shipping_address_city,
    state: vendor.shipping_address_state,
    postcode: vendor.shipping_address_postcode,
    country: vendor.shipping_address_country,
    phone: vendor.shipping_address_phone,
  };

  const hasPhones = Boolean(vendor.personal_phone || vendor.work_phone);

  return (
    <>
      {/* Задолженность: главное число крупно, детали — волосяными строками. */}
      <Card className="p-4 sm:p-5">
        <div className="text-sm text-text-secondary">
          {intl.get('vendor.drawer.label.outstanding_payable')}
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
          {vendor.formatted_balance || EMPTY_VALUE}
        </div>

        <dl className="m-0 mt-4">
          <DetailRow label={intl.get('vendor.drawer.label.unused_credits')}>
            <span className="tabular-nums">0</span>
          </DetailRow>
          <DetailRow label={intl.get('vendor.drawer.label.opening_balance')}>
            <span className="tabular-nums">
              {vendor.formatted_opening_balance || EMPTY_VALUE}
            </span>
          </DetailRow>
          <DetailRow label={intl.get('vendor.drawer.label.opening_balance_at')}>
            {vendor.formatted_opening_balance_at || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('vendor.drawer.label.currency')}>
            {vendor.currency_code || EMPTY_VALUE}
          </DetailRow>
        </dl>
      </Card>

      {/* Контакты. */}
      <Card className="p-4 sm:p-5">
        <CardTitleSm>{intl.get('contacts')}</CardTitleSm>

        <dl className="m-0 mt-3">
          <DetailRow label={intl.get('vendor.drawer.label.company_name')}>
            {vendor.company_name || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('email')}>
            {vendor.email || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('vendor.drawer.label.phone_number')}>
            {hasPhones ? (
              <span className="flex flex-col gap-0.5">
                {vendor.personal_phone ? (
                  <span>{vendor.personal_phone}</span>
                ) : null}
                {vendor.work_phone ? <span>{vendor.work_phone}</span> : null}
              </span>
            ) : (
              EMPTY_VALUE
            )}
          </DetailRow>
          <DetailRow label={intl.get('vendor.drawer.label.website')}>
            {vendor.website || EMPTY_VALUE}
          </DetailRow>
        </dl>
      </Card>

      {/* Адреса: две колонки на широком, одна — на мобильном. */}
      <Card className="p-4 sm:p-5">
        <CardTitleSm>{intl.get('vendor.drawer.section.addresses')}</CardTitleSm>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AddressBlock
            title={intl.get('billing_address')}
            address={billingAddress}
          />
          <AddressBlock
            title={intl.get('shipping_address')}
            address={shippingAddress}
          />
        </div>
      </Card>

      {/* Примечание — только если есть. */}
      {vendor.note ? (
        <Card className="p-4 sm:p-5">
          <CardTitleSm>{intl.get('vendor.drawer.label.note')}</CardTitleSm>
          <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">
            {vendor.note}
          </p>
        </Card>
      ) : null}
    </>
  );
}
