// @ts-nocheck
import { useFormikContext } from 'formik';
import moment from 'moment';
import { useUpdateEntriesOnExchangeRateChange } from './useUpdateEntriesOnExchangeRateChange';
import { useAutoExRateContext } from './AutoExchangeProvider';
import { pickSyncedExRate } from './pickSyncedExRate';
import { useCallback, useEffect } from 'react';
import { useCurrentOrganization } from '@/hooks/state';

/**
 * Re-calculate the item entries prices based on the old exchange rate.
 * @param {InvoiceExchangeRateInputFieldRoot} Component
 * @returns {JSX.Element}
 */
export const withExchangeRateItemEntriesPriceRecalc =
  (Component) => (props) => {
    const { setFieldValue } = useFormikContext<any>();
    const updateChangeExRate = useUpdateEntriesOnExchangeRateChange();

    return (
      <Component
        onRecalcConfirm={({ exchangeRate, oldExchangeRate }) => {
          setFieldValue(
            'entries',
            updateChangeExRate(oldExchangeRate, exchangeRate),
          );
        }}
        {...props}
      />
    );
  };

/**
 * Injects the loading props to the exchange rate field.
 * @param Component
 * @returns {}
 */
export const withExchangeRateFetchingLoading = (Component) => (props) => {
  const { isAutoExchangeRateLoading } = useAutoExRateContext();

  return (
    <Component
      isLoading={isAutoExchangeRateLoading}
      inputGroupProps={{
        disabled: isAutoExchangeRateLoading,
      }}
    />
  );
};

/**
 * Updates the customer currency code and exchange rate once you update the customer
 * then change the state to fetch the realtime exchange rate of the new selected currency.
 */
export const useCustomerUpdateExRate = () => {
  const { setFieldValue, values } = useFormikContext<any>();
  const { setAutoExRateCurrency } = useAutoExRateContext();

  const updateEntriesOnExChange = useUpdateEntriesOnExchangeRateChange();
  const currentCompany = useCurrentOrganization();

  const DEFAULT_EX_RATE = 1;

  return useCallback(
    (customer) => {
      // Reset the auto exchange rate currency cycle.
      setAutoExRateCurrency(null);

      // If the customer's currency code equals the same base currency.
      if (customer.currency_code === currentCompany.base_currency) {
        setFieldValue('exchange_rate', DEFAULT_EX_RATE + '');
        setFieldValue(
          'entries',
          updateEntriesOnExChange(values.exchange_rate, DEFAULT_EX_RATE),
        );
      } else {
        // Sets the currency code to fetch exchange rate of the given currency code.
        setAutoExRateCurrency(customer?.currency_code);
      }
    },
    [
      currentCompany.base_currency,
      setAutoExRateCurrency,
      setFieldValue,
      updateEntriesOnExChange,
      values.exchange_rate,
    ],
  );
};

interface UseSyncExRateToFormProps {
  onSynced?: () => void;
}

/**
 * Syncs the realtime exchange rate to the Formik form and then re-calculates
 * the entries rate based on the given new and old ex. rate.
 * @param {UseSyncExRateToFormProps} props -
 * @returns {React.ReactNode}
 */
/**
 * Поле даты документа в каждой из форм зовётся по-своему; в значениях формы
 * одновременно живёт ровно одно из этих имён.
 */
const DOCUMENT_DATE_FIELDS = [
  'invoice_date',
  'estimate_date',
  'receipt_date',
  'credit_note_date',
] as const;

export const useSyncExRateToForm = ({ onSynced }: UseSyncExRateToFormProps) => {
  const { setFieldValue, values } = useFormikContext<any>();
  const {
    autoExRateCurrency,
    autoExchangeRate,
    isAutoExchangeRateLoading,
    setAutoExRateDate,
  } = useAutoExRateContext();
  const updateEntriesOnExChange = useUpdateEntriesOnExchangeRateChange();

  // Курс на день сделки, а не на сегодня (К1 срез 2 карты v17): дата
  // документа уходит в провайдер автокурса. Сегодняшняя дата не передаётся —
  // у сервера остаётся запасной поставщик, умеющий только «сегодня».
  const documentDateField = DOCUMENT_DATE_FIELDS.find(
    (field) => (values as any)[field] !== undefined,
  );
  const documentDate = documentDateField
    ? (values as any)[documentDateField]
    : '';
  const today = moment().format('YYYY-MM-DD');

  useEffect(() => {
    setAutoExRateDate?.(
      documentDate && documentDate !== today ? documentDate : '',
    );
  }, [documentDate, today, setAutoExRateDate]);

  // Sync the fetched real-time exchanage rate to the form.
  useEffect(() => {
    if (!isAutoExchangeRateLoading && autoExRateCurrency) {
      // Раньше здесь стояла единица «на случай, если служба курсов не
      // настроена или ответила ошибкой» — и счёт в валюте молча считался
      // один к одному с рублём. Курса нет — поле остаётся человеку, а
      // сообщение об этом уже показано (М3 карты v15).
      const exchangeRate = pickSyncedExRate(autoExchangeRate?.exchange_rate);

      if (exchangeRate === null) {
        onSynced?.();
        return;
      }
      setFieldValue('exchange_rate', exchangeRate + '');
      setFieldValue(
        'entries',
        updateEntriesOnExChange(values.exchange_rate, exchangeRate),
      );
      onSynced?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autoExchangeRate?.exchange_rate,
    autoExRateCurrency,
    isAutoExchangeRateLoading,
  ]);

  return null;
};
