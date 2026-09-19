// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';

import {
  useCapitalization,
  useSetProfitMultiple,
} from '@/hooks/query/capitalization';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { formatOrganizationNumber } from '@/utils/organizationNumber';
import { Skeleton } from '@/components/ui/skeleton';
import { ScreenError } from '@/components/ui/screen-error';
import { pickScreenState } from '@/components/ui/screen-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Money } from '@/components/ui/money';
import { cn } from '@/lib/cn';

import {
  buildDriverRows,
  capitalizationWarning,
  primaryValuation,
} from './capitalizationView';

const money = (value: number | null | undefined) =>
  formatOrganizationMoney(value ?? 0);

function Card({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-default border border-border p-4">
      <h2 className="mb-3 text-sm font-medium text-text-muted">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Экран «Сколько стоит мой бизнес» (этап 11 ТЗ).
 *
 * Отвечает на один вопрос владельца и не притворяется, что знает больше:
 * когда оценку посчитать нельзя, экран говорит об этом прямо, а не рисует
 * уверенный ноль.
 *
 * Все числа считает сервер — здесь только показ.
 */
export default function CapitalizationPage() {
  const today = moment();
  const [fromDate] = React.useState(
    today.clone().startOf('year').format('YYYY-MM-DD'),
  );
  const [toDate] = React.useState(today.format('YYYY-MM-DD'));

  const { data, isLoading, isError, refetch } = useCapitalization({
    fromDate,
    toDate,
  });

  const { mutateAsync: saveMultiple, isLoading: isSaving } =
    useSetProfitMultiple();

  const [multipleInput, setMultipleInput] = React.useState('');

  // Поле подхватывает сохранённый множитель, когда он приезжает с сервера,
  // но не затирает то, что человек уже начал печатать.
  const savedMultiple = data?.profitMultiple ?? null;
  React.useEffect(() => {
    setMultipleInput(savedMultiple == null ? '' : String(savedMultiple));
  }, [savedMultiple]);

  const screenState = pickScreenState({ isLoading, isError });

  if (screenState === 'loading') {
    return <Skeleton className="m-6 h-96 w-full" />;
  }

  if (screenState === 'error') {
    return (
      <div className="p-6">
        <ScreenError
          message={intl.get('capitalization.error')}
          onRetry={() => refetch?.()}
        />
      </div>
    );
  }

  const warning = capitalizationWarning(data as any);
  const primary = primaryValuation(data as any);
  const drivers = buildDriverRows(data?.drivers as any);
  const na = intl.get('capitalization.not_applicable');

  const onSaveMultiple = async () => {
    const trimmed = multipleInput.trim();
    const parsed = trimmed === '' ? null : Number(trimmed.replace(',', '.'));

    await saveMultiple({
      profitMultiple:
        parsed != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null,
    });
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">
        {intl.get('capitalization.page.title')}
      </h1>

      {/*
        Предупреждение стоит НАД цифрами: оценка, посчитанная не из того,
        выглядит так же уверенно, как правильная.
      */}
      {warning && (
        <div className="rounded-control border border-warning bg-warning/10 p-3 text-sm">
          {intl.get(`capitalization.warning.${warning}`)}
        </div>
      )}

      <Card title={intl.get(`capitalization.primary.${primary.key}`)}>
        <div className="flex flex-col gap-1">
          {/* Главное число экрана. Расход тут ни при чём — это стоимость,
              и красным она становится только когда бизнес стоит меньше
              нуля, то есть долгов больше, чем имущества. */}
          <Money
            hero
            align="left"
            tone={primary.value < 0 ? 'problem' : 'default'}
          >
            {money(primary.value)}
          </Money>
          <p className="text-sm text-text-muted">
            {intl.get('capitalization.primary.hint')}
          </p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={intl.get('capitalization.balance.title')}>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <span>{intl.get('capitalization.assets')}</span>
              <span className="money">{money(data?.assets)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span>{intl.get('capitalization.liabilities')}</span>
              <span className="money">{money(data?.liabilities)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2 font-medium">
              <span>{intl.get('capitalization.net_assets')}</span>
              <span className="money">{money(data?.netAssets)}</span>
            </div>
          </div>
        </Card>

        <Card title={intl.get('capitalization.owner.title')}>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <span>{intl.get('capitalization.owner.share')}</span>
              <span className="money">
                {data?.ownershipSharePercent == null
                  ? na
                  : `${formatOrganizationNumber(data.ownershipSharePercent)}%`}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2 font-medium">
              <span>{intl.get('capitalization.owner.value')}</span>
              <span className="money">
                {data?.ownerValue?.applicable
                  ? money(data?.ownerValue?.value)
                  : na}
              </span>
            </div>
            <p className="text-text-muted">
              {intl.get('capitalization.owner.hint')}
            </p>
          </div>
        </Card>
      </div>

      <Card title={intl.get('capitalization.multiple.title')}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-muted">
            {intl.get('capitalization.multiple.hint')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              inputMode="decimal"
              className="w-32"
              value={multipleInput}
              onChange={(event) => setMultipleInput(event.target.value)}
              placeholder={intl.get('capitalization.multiple.placeholder')}
              aria-label={intl.get('capitalization.multiple.title')}
            />
            <Button
              type="button"
              onClick={onSaveMultiple}
              disabled={isSaving}
            >
              {intl.get(
                isSaving ? 'capitalization.multiple.saving' : 'save',
              )}
            </Button>
          </div>
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span>{intl.get('capitalization.multiple.valuation')}</span>
            <span className="money">
              {data?.multipleValuation?.applicable
                ? money(data?.multipleValuation?.value)
                : na}
            </span>
          </div>
        </div>
      </Card>

      {drivers.length > 0 && (
        <Card title={intl.get('capitalization.drivers.title')}>
          <div className="flex flex-col gap-2 text-sm">
            {drivers.map((driver) => (
              <div
                key={driver.key}
                className="flex items-baseline justify-between gap-4"
              >
                <span>
                  {intl.get(`capitalization.driver.${driver.key}`)}
                </span>
                <span
                  className={cn(
                    'money',
                    // Направление берётся из СМЫСЛА статьи, а не из знака:
                    // долг уменьшает стоимость, даже будучи записан
                    // положительным числом.
                    driver.direction === 'down' && 'text-text-muted',
                  )}
                >
                  {driver.direction === 'up' ? '+' : '−'} {money(driver.amount)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
