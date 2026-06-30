import { getAllCountries } from '@bigfin/utils';

import type { ComboboxItem } from '@/components/ui/combobox';
import { getAllCurrenciesOptions } from '@/constants/currencies';
import { getFiscalYear } from '@/constants/fiscalYearOptions';
import { getLanguages } from '@/constants/languagesOptions';

export interface SelectOption {
  value: string;
  label: string;
}

export const countryOptions = (): ComboboxItem[] =>
  getAllCountries().map((c: any) => ({ value: c.countryCode, label: c.name }));

export const currencyOptions = (): ComboboxItem[] =>
  getAllCurrenciesOptions().map((c: any) => ({ value: c.key, label: c.name }));

export const timezoneOptions = (): ComboboxItem[] => {
  const supported = (Intl as any).supportedValuesOf;
  const list: string[] =
    typeof supported === 'function'
      ? supported('timeZone')
      : ['UTC', 'Europe/Moscow', 'Europe/London', 'America/New_York'];
  return list.map((tz) => ({ value: tz, label: tz }));
};

export const fiscalYearOptions = (): SelectOption[] =>
  getFiscalYear().map((f: any) => ({ value: f.key, label: f.name }));

export const languageOptions = (): SelectOption[] =>
  getLanguages().map((l: any) => ({ value: l.value, label: l.name }));

export const dateFormatOptions = (
  dateFormats: { key: string; label: string }[],
): SelectOption[] =>
  (dateFormats ?? []).map((d) => ({ value: d.key, label: d.label }));
