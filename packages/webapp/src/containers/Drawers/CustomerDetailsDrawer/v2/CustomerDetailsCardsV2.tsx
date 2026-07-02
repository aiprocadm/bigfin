import { ReactNode } from 'react';
import intl from 'react-intl-universal';

import { Card } from '@/components/ui/card';

import type { CustomerAddress, CustomerDetail } from './types';

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
function addressLines(address: CustomerAddress): string[] {
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

function AddressBlock({ title, address }: { title: string; address: CustomerAddress }) {
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
 * Карточки данных клиента: баланс (деньги — tabular-nums), контакты,
 * адреса, примечание. Пустые значения — спокойное «—».
 */
export function CustomerDetailsCardsV2({ customer }: { customer: CustomerDetail }) {
  const billingAddress: CustomerAddress = {
    address1: customer.billing_address1,
    address2: customer.billing_address2,
    city: customer.billing_address_city,
    state: customer.billing_address_state,
    postcode: customer.billing_address_postcode,
    country: customer.billing_address_country,
    phone: customer.billing_address_phone,
  };
  const shippingAddress: CustomerAddress = {
    address1: customer.shipping_address1,
    address2: customer.shipping_address2,
    city: customer.shipping_address_city,
    state: customer.shipping_address_state,
    postcode: customer.shipping_address_postcode,
    country: customer.shipping_address_country,
    phone: customer.shipping_address_phone,
  };

  const hasPhones = Boolean(customer.personal_phone || customer.work_phone);

  return (
    <>
      {/* Баланс: главное число крупно, детали — волосяными строками. */}
      <Card className="p-4 sm:p-5">
        <div className="text-sm text-text-secondary">
          {intl.get('customer.drawer.label.outstanding_receivable')}
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
          {customer.formatted_balance || EMPTY_VALUE}
        </div>

        <dl className="m-0 mt-4">
          <DetailRow label={intl.get('customer.drawer.label.unused_credits')}>
            <span className="tabular-nums">0</span>
          </DetailRow>
          <DetailRow label={intl.get('customer.drawer.label.opening_balance')}>
            <span className="tabular-nums">
              {customer.formatted_opening_balance || EMPTY_VALUE}
            </span>
          </DetailRow>
          <DetailRow
            label={intl.get('customer.drawer.label.opening_balance_at')}
          >
            {customer.formatted_opening_balance_at || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('customer.drawer.label.currency')}>
            {customer.currency_code || EMPTY_VALUE}
          </DetailRow>
        </dl>
      </Card>

      {/* Контакты. */}
      <Card className="p-4 sm:p-5">
        <CardTitleSm>{intl.get('contacts')}</CardTitleSm>

        <dl className="m-0 mt-3">
          <DetailRow label={intl.get('customer.drawer.label.company_name')}>
            {customer.company_name || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('customer.drawer.label.email')}>
            {customer.email || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('customer.drawer.label.phone_number')}>
            {hasPhones ? (
              <span className="flex flex-col gap-0.5">
                {customer.personal_phone ? (
                  <span>{customer.personal_phone}</span>
                ) : null}
                {customer.work_phone ? <span>{customer.work_phone}</span> : null}
              </span>
            ) : (
              EMPTY_VALUE
            )}
          </DetailRow>
          <DetailRow label={intl.get('customer.drawer.label.website')}>
            {customer.website || EMPTY_VALUE}
          </DetailRow>
        </dl>
      </Card>

      {/* Адреса: две колонки на широком, одна — на мобильном. */}
      <Card className="p-4 sm:p-5">
        <CardTitleSm>{intl.get('customer.drawer.section.addresses')}</CardTitleSm>

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
      {customer.note ? (
        <Card className="p-4 sm:p-5">
          <CardTitleSm>{intl.get('customer.drawer.label.note')}</CardTitleSm>
          <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">
            {customer.note}
          </p>
        </Card>
      ) : null}
    </>
  );
}
