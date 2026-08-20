import React from 'react';
import intl from 'react-intl-universal';
import { useFormContext } from 'react-hook-form';

import { Combobox } from '@/components/ui/combobox';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGeneralFormContext } from './GeneralFormProvider';
import type { GeneralFormContextValue } from './General.types';
import {
  countryOptions,
  currencyOptions,
  dateFormatOptions,
  fiscalYearOptions,
  languageOptions,
  timezoneOptions,
} from './options';
import {
  ORGANIZATION_LEGAL_FORMS,
  TAX_REGIMES,
  withLabels,
} from './requisitesOptions';
import type { GeneralFormValues } from './General.zod';

/**
 * Текстовые реквизиты. Банковская четвёрка идёт последней и с подсказкой:
 * именно она печатается в счёте на оплату, и без неё платить не по чему.
 */
const REQUISITE_TEXT_FIELDS = [
  { name: 'inn', labelKey: 'requisites.inn', hintKey: 'requisites.inn.hint' },
  { name: 'kpp', labelKey: 'requisites.kpp', hintKey: 'requisites.kpp.hint' },
  { name: 'ogrn', labelKey: 'requisites.ogrn', hintKey: 'requisites.ogrn.hint' },
  { name: 'bank_name', labelKey: 'requisites.bank_name', hintKey: null },
  { name: 'bank_bik', labelKey: 'requisites.bank_bik', hintKey: null },
  {
    name: 'bank_account',
    labelKey: 'requisites.bank_account',
    hintKey: null,
  },
  {
    name: 'bank_correspondent_account',
    labelKey: 'requisites.bank_correspondent_account',
    hintKey: 'requisites.bank.hint',
  },
] as const;

const ADDRESS_FIELDS = [
  { name: 'address1', placeholderKey: 'preferences.general.address_1' },
  { name: 'address2', placeholderKey: 'preferences.general.address_2' },
  { name: 'city', placeholderKey: 'preferences.general.city' },
  { name: 'postal_code', placeholderKey: 'preferences.general.zip_code' },
  { name: 'state_province', placeholderKey: 'preferences.general.state_province' },
  { name: 'phone', placeholderKey: 'phone_number_' },
] as const;

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="flex flex-col gap-4">
    <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
    {children}
  </div>
);

export default function GeneralForm() {
  const form = useFormContext<GeneralFormValues>();
  const { dateFormats, baseCurrencyMutateAbility } =
    useGeneralFormContext() as GeneralFormContextValue;
  const baseCurrencyDisabled = (baseCurrencyMutateAbility?.length ?? 0) > 0;

  const search = intl.get('preferences.combobox.search');
  const empty = intl.get('preferences.combobox.empty');

  const countries = React.useMemo(countryOptions, []);
  const currencies = React.useMemo(currencyOptions, []);
  const timezones = React.useMemo(timezoneOptions, []);
  const fiscalYears = React.useMemo(fiscalYearOptions, []);
  const languages = React.useMemo(languageOptions, []);
  const dateFmts = React.useMemo(
    () => dateFormatOptions(dateFormats),
    [dateFormats],
  );
  const legalForms = React.useMemo(
    () => withLabels(ORGANIZATION_LEGAL_FORMS),
    [],
  );
  const taxRegimes = React.useMemo(() => withLabels(TAX_REGIMES), []);

  return (
    <div className="flex flex-col gap-8">
      <Section title={intl.get('preferences.general.section.organization')}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('organization_name')}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>
                {intl.get('shown_on_sales_forms_and_purchase_orders')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tax_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('organization_tax_number')}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              {/*
                Ловушка из карты v16: поле подписано «ИНН организации», но это
                колонка `tax_number`, которую не читает ни одна печатная форма.
                Пока судьба поля не решена (вопрос 29), хотя бы говорим прямо,
                где настоящий ИНН — иначе рядом стоят два поля с одним именем.
              */}
              <FormDescription>
                {intl.get('preferences.general.tax_number.hint')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('organization_industry')}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('business_location')}</FormLabel>
              <FormControl>
                <Combobox
                  items={countries}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder={intl.get('select_business_location')}
                  searchPlaceholder={search}
                  emptyText={empty}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </Section>

      {/*
        Реквизиты (Р2 срез 1 карты v16). Девять колонок давно есть в базе, и
        сервер их принимает и проверяет — а полей в интерфейсе не было ни
        одного. Из-за этого в счёте на оплату пустыми уходили банк, БИК,
        расчётный и корреспондентский счёт: по такому счёту физически нельзя
        заплатить, а счёт-фактура без ИНН/КПП недействительна для вычета НДС.
      */}
      <Section title={intl.get('preferences.general.section.requisites')}>
        <FormField
          control={form.control}
          name="legal_form"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('requisites.legal_form')}</FormLabel>
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={intl.get('requisites.legal_form.select')}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {legalForms.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tax_regime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('requisites.tax_regime')}</FormLabel>
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={intl.get('requisites.tax_regime.select')}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {taxRegimes.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {REQUISITE_TEXT_FIELDS.map(({ name, labelKey, hintKey }) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get(labelKey)}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} />
                </FormControl>
                {hintKey ? (
                  <FormDescription>{intl.get(hintKey)}</FormDescription>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </Section>

      <Section title={intl.get('preferences.general.section.address')}>
        {ADDRESS_FIELDS.map(({ name, placeholderKey }) => (
          <FormField
            key={name}
            control={form.control}
            name={`address.${name}` as const}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    placeholder={intl.get(placeholderKey)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </Section>

      <Section title={intl.get('preferences.general.section.localization')}>
        <FormField
          control={form.control}
          name="base_currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('base_currency')}</FormLabel>
              <FormControl>
                <Combobox
                  items={currencies}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  disabled={baseCurrencyDisabled}
                  placeholder={intl.get('select_base_currency')}
                  searchPlaceholder={search}
                  emptyText={empty}
                />
              </FormControl>
              {baseCurrencyDisabled ? (
                <FormDescription>
                  {intl.get(
                    'you_can_t_change_the_base_currency_as_there_are_transactions',
                  )}
                </FormDescription>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fiscal_year"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('fiscal_year')}</FormLabel>
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={intl.get('select_fiscal_year')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {fiscalYears.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {intl.get('for_reporting_you_can_specify_any_month')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('language')}</FormLabel>
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={intl.get('select_language')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {languages.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('time_zone')}</FormLabel>
              <FormControl>
                <Combobox
                  items={timezones}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder={intl.get('select_time_zone')}
                  searchPlaceholder={search}
                  emptyText={empty}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date_format"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('date_format')}</FormLabel>
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={intl.get('select_date_format')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {dateFmts.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </Section>
    </div>
  );
}
