import React from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { useLatestExchangeRate } from '@/hooks/query';
import { AppToaster } from '@/components/AppToaster';
import { showApiError } from '@/utils/showApiError';

interface AutoExchangeRateProviderProps {
  children: React.ReactNode;
}

interface AutoExchangeRateProviderValue {
  autoExRateCurrency: string;
  isAutoExchangeRateLoading: boolean;
  isAutoExchangeRateStale: boolean;
  // Остальное, что кладёт поставщик. Тип пока не описан — до этой карты
  // эти поля не были объявлены вовсе, и каждое чтение считалось ошибкой.
  setAutoExRateCurrency: any;
  autoExRateDate: any;
  setAutoExRateDate: any;
  autoExchangeRate: any;

}

const AutoExchangeRateContext = React.createContext(
  {} as AutoExchangeRateProviderValue,
);

function AutoExchangeRateProvider({ children }: AutoExchangeRateProviderProps) {
  const [autoExRateCurrency, setAutoExRateCurrency] =
    React.useState<string>('');
  // Дата документа: курс должен быть на день сделки, а не на сегодня
  // (К1 срез 2 карты v17). Сегодняшняя дата не передаётся вовсе — тогда у
  // сервера остаётся запасной поставщик, который умеет только «сегодня».
  const [autoExRateDate, setAutoExRateDate] = React.useState<string>('');

  // Retrieves the exchange rate.
  const { data: autoExchangeRate, isLoading: isAutoExchangeRateLoading } =
    useLatestExchangeRate(
      { fromCurrency: autoExRateCurrency, date: autoExRateDate || undefined },
      {
        enabled: Boolean(autoExRateCurrency),
        refetchOnWindowFocus: false,
        staleTime: 0,
        cacheTime: 0,
        retry: 0,
        // Раньше отказ службы курсов проглатывался молча: поле курса просто
        // оставалось пустым, и человек не понимал, почему (М3 карты v15).
        onError: (error: unknown) =>
          showApiError(error, {}, 'error.ex_rate_failed'),
      },
    );

  // Курс из последнего успешного ответа — рабочий, но человек должен знать,
  // что он не сегодняшний, иначе документ уйдёт по вчерашней цене молча.
  // Ответ сервера приходит в snake_case (общий перехватчик), поэтому поле
  // называется `is_stale`, а не `isStale`.
  const isAutoExchangeRateStale = Boolean(autoExchangeRate?.is_stale);

  React.useEffect(() => {
    if (isAutoExchangeRateStale) {
      AppToaster.show({
        message: intl.get('exchange_rate.stale_notice'),
        intent: Intent.WARNING,
      });
    }
  }, [isAutoExchangeRateStale, autoExchangeRate?.exchange_rate]);

  const value = {
    autoExRateCurrency,
    setAutoExRateCurrency,
    autoExRateDate,
    setAutoExRateDate,
    isAutoExchangeRateLoading,
    isAutoExchangeRateStale,
    autoExchangeRate,
  };

  return (
    <AutoExchangeRateContext.Provider value={value}>
      {children}
    </AutoExchangeRateContext.Provider>
  );
}

const useAutoExRateContext = () => React.useContext(AutoExchangeRateContext);

export {
  useAutoExRateContext,
  AutoExchangeRateContext,
  AutoExchangeRateProvider,
};
