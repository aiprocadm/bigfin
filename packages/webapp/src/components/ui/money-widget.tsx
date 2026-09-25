import * as React from 'react';
import intl from 'react-intl-universal';

import { cn } from '@/lib/cn';
import { Sparkline } from './sparkline';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Sheet } from './sheet';
import { useIsPhone } from './use-media-query';

/**
 * Виджет «Деньги» в шапке (FIN-006 ТЗ-2) с разрезом по счетам (FIN-007) и
 * группами счетов (FIN-017).
 *
 * ЗАЧЕМ. Остаток и предупреждение о разрыве жили только на главной. Уйдя в
 * отчёты или в операции, человек терял из виду главный факт своего дня:
 * сколько денег и когда они кончатся.
 *
 * ПОЧЕМУ СТРОКА РАЗРЫВА ЖЁЛТАЯ, А НЕ КРАСНАЯ. Разрыв в будущем — это
 * предупреждение: время починить ещё есть. Красным он кричал бы об аварии,
 * которой пока нет, и на третий день его перестали бы замечать. Красным
 * строка становится, только когда разрыв УЖЕ начался.
 */
export interface MoneyWidgetGap {
  from: string;
  to: string | null;
  deepestAmount: number;
  deepestDate: string;
  formatted?: string;
}

export interface MoneyWidgetAccountGroup {
  id: number;
  name: string;
  accountsCount?: number;
}

export interface MoneyWidgetAccount {
  accountId: number;
  accountName: string;
  /** Группа счёта; `null` — «Нераспределённые» (FIN-017 ТЗ-2). */
  accountGroupId?: number | null;
  balance: number;
  gaps: Array<{
    from: string;
    to: string | null;
    deepestAmount: number;
    deepestDate: string;
  }>;
  forecastFailed?: boolean;
}

export interface MoneyWidgetProps {
  totalFormatted: string;
  /** Короткая сумма для телефона («1,75 млн ₽»): полная там не помещается (UI-042-1 ТЗ-4). */
  totalCompact?: string;
  gap?: MoneyWidgetGap | null;
  sparkline?: number[];
  accounts?: MoneyWidgetAccount[];
  groups?: MoneyWidgetAccountGroup[];
  plannedWithoutAccount?: number;
  calendarEnabled?: boolean;
  /** Как показать сумму счёта в панели. */
  formatMoney?: (value: number) => string;
  /** Сегодняшняя дата — параметром, чтобы поведение можно было проверить. */
  today?: string;
  className?: string;
}

/** Разрыв, который уже начался, — это не предупреждение, а факт. */
export const gapHasStarted = (gap: { from: string }, today: string): boolean =>
  Boolean(gap?.from) && gap.from <= today;

/**
 * Цвет точки состояния счёта.
 *
 * Точка НИКОГДА не единственный носитель смысла: рядом всегда текст и
 * подсказка — иначе человек, не различающий цвета, не узнает ничего.
 */
export const accountGapTone = (
  gaps: Array<{ from: string }> | undefined,
  today: string,
): 'success' | 'warning' | 'danger' => {
  const first = (gaps ?? [])[0];
  if (!first) return 'success';
  if (gapHasStarted(first, today)) return 'danger';

  const days =
    (new Date(first.from).getTime() - new Date(today).getTime()) / 86_400_000;

  // Две недели — столько нужно, чтобы успеть что-то сделать: занять,
  // передвинуть платёж, поторопить должника.
  return days > 14 ? 'warning' : 'danger';
};

/**
 * Раскладывает счета по группам.
 *
 * Пустая НАСТРОЕННАЯ группа показывается: человек её завёл и должен видеть,
 * что она есть и пока пуста. А «Нераспределённые» появляются только когда в
 * них кто-то есть — пустая кучка в конце списка ничего не сообщает.
 */
export function groupAccounts(
  accounts: MoneyWidgetAccount[],
  groups: MoneyWidgetAccountGroup[],
  ungroupedTitle: string,
): Array<{ id: number | null; name: string; accounts: MoneyWidgetAccount[] }> {
  const byGroup = new Map<number | null, MoneyWidgetAccount[]>();

  accounts.forEach((account) => {
    const key = account.accountGroupId ?? null;
    byGroup.set(key, [...(byGroup.get(key) ?? []), account]);
  });

  const named = groups.map((group) => ({
    id: group.id as number | null,
    name: group.name,
    accounts: byGroup.get(group.id) ?? [],
  }));
  const ungrouped = byGroup.get(null) ?? [];

  return ungrouped.length > 0
    ? [...named, { id: null, name: ungroupedTitle, accounts: ungrouped }]
    : named;
}

const TONE_CLASS: Record<string, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

/** Строка счёта в панели: точка состояния, имя, разрыв и остаток. */
function AccountRow({
  account,
  today,
  formatMoney,
}: {
  account: MoneyWidgetAccount;
  today: string;
  formatMoney: (value: number) => string;
}) {
  const tone = accountGapTone(account.gaps, today);
  const first = account.gaps?.[0];

  return (
    <li className="flex items-start justify-between gap-3 py-2 text-sm">
      <span className="flex min-w-0 items-start gap-2">
        <span
          className={cn(
            'mt-1.5 h-2 w-2 shrink-0 rounded-full',
            TONE_CLASS[tone],
          )}
          aria-hidden="true"
        />
        <span className="min-w-0">
          <span className="block truncate">{account.accountName}</span>
          {account.forecastFailed ? (
            <span className="block text-xs text-text-secondary">
              {intl.get('money_widget.forecast_failed')}
            </span>
          ) : first ? (
            <span
              className={cn(
                'block text-xs',
                tone === 'danger' ? 'text-danger' : 'text-warning',
              )}
            >
              {intl.get('money_widget.account_gap', {
                from: first.from,
                to: first.to ?? '—',
                amount: formatMoney(first.deepestAmount),
              })}
            </span>
          ) : null}
        </span>
      </span>
      <span className="shrink-0 tabular-nums">
        {formatMoney(account.balance)}
      </span>
    </li>
  );
}

export function MoneyWidget({
  totalFormatted,
  totalCompact,
  gap,
  sparkline = [],
  accounts = [],
  groups = [],
  plannedWithoutAccount = 0,
  calendarEnabled = true,
  formatMoney = (value) => String(value),
  today = new Date().toISOString().slice(0, 10),
  className,
}: MoneyWidgetProps) {
  const started = gap ? gapHasStarted(gap, today) : false;
  const grouped = React.useMemo(
    () => groupAccounts(accounts, groups, intl.get('money_widget.ungrouped')),
    [accounts, groups],
  );
  const noGaps =
    accounts.length > 0 && accounts.every((a) => (a.gaps ?? []).length === 0);
  const isPhone = useIsPhone();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const details = (
    <>
      {!calendarEnabled ? (
        // Выключенный календарь — это ОТВЕТ, а не ошибка. Промолчать
        // значило бы оставить человека гадать, почему прогноза нет.
        <p className="text-sm text-text-secondary">
          {intl.get('money_widget.calendar_off')}
        </p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-text-secondary">
          {intl.get('money_widget.no_accounts')}
        </p>
      ) : groups.length > 0 ? (
        <div className="flex flex-col gap-3">
          {grouped.map((group) => (
            <section key={String(group.id)}>
              <h4 className="mb-1 text-xs font-semibold text-text-secondary">
                {group.name}
              </h4>
              {group.accounts.length === 0 ? (
                <p className="text-xs text-text-secondary">
                  {intl.get('money_widget.empty_group')}
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {group.accounts.map((account) => (
                    <AccountRow
                      key={account.accountId}
                      account={account}
                      today={today}
                      formatMoney={formatMoney}
                    />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {accounts.map((account) => (
            <AccountRow
              key={account.accountId}
              account={account}
              today={today}
              formatMoney={formatMoney}
            />
          ))}
        </ul>
      )}

      {calendarEnabled && noGaps && (
        <p className="mt-2 text-xs text-text-secondary">
          {intl.get('money_widget.no_gaps')}
        </p>
      )}

      {plannedWithoutAccount > 0 && (
        // Плановые операции без счёта в разрез не попадают. Промолчать —
        // значит дать человеку сверить разрезы с общим итогом и не
        // сойтись, не понимая почему.
        <p className="mt-2 text-xs text-text-secondary">
          {intl.get('money_widget.planned_without_account', {
            count: plannedWithoutAccount,
          })}
        </p>
      )}
    </>
  );

  // Кнопка — общая для обоих видов; на телефоне она открывает шторку.
  const trigger = (
    <button
      type="button"
      className={cn(
        'flex items-center gap-2 rounded-control px-2 py-1 text-left hover:bg-surface-elevated',
        className,
      )}
    >
      <span className="flex flex-col">
        {/* На телефоне полная сумма не помещалась и обрезалась слева:
            человек видел «749 839,09 ₽» вместо «1 749 839,09 ₽». Там —
            короткая запись, полная — в окне по нажатию. */}
        <span className="text-headline tabular-nums">
          <span className="inline-flex items-center gap-1.5 sm:hidden">
            {totalCompact || totalFormatted}
            {gap && (
              <span
                role="img"
                aria-label={intl.get('money_widget.gap_from', { date: gap.from })}
                className={cn(
                  'inline-block h-2 w-2 rounded-full',
                  started ? 'bg-danger' : 'bg-warning',
                )}
              />
            )}
          </span>
          <span className="hidden sm:inline">{totalFormatted}</span>
        </span>
        {gap && (
          // На телефоне строка «Разрыв с …» рвалась на две и налезала на
          // соседей — там она в шторке, а здесь точка того же цвета рядом
          // с суммой (подпись точки — для чтения с экрана).
          <span
            className={cn(
              'hidden text-xs font-medium leading-tight sm:block',
              started ? 'text-danger' : 'text-warning',
            )}
          >
            {intl.get('money_widget.gap_from', { date: gap.from })}
          </span>
        )}
      </span>
      {sparkline.length > 1 && (
        <span className="hidden sm:inline-flex">
          <Sparkline
            points={sparkline.map((value, index) => ({
              label: String(index + 1),
              value,
            }))}
            formatValue={formatMoney}
            width={96}
            height={24}
          />
        </span>
      )}
    </button>
  );

  // На телефоне — шторка снизу (UI-045-7 ТЗ-4). Всплывающее окно у верхнего
  // края там не помещалось в ширину, а искорка 30 дней на телефоне была
  // скрыта вовсе: в шторке место есть, и она показывается над счетами.
  if (isPhone) {
    return (
      <>
        {React.cloneElement(trigger, { onClick: () => setSheetOpen(true) })}
        <Sheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={intl.get('money_widget.sheet_title')}
          description={totalFormatted}
        >
          {gap && (
            <p
              className={cn(
                'mb-3 text-subhead font-medium',
                started ? 'text-danger' : 'text-warning',
              )}
            >
              {intl.get('money_widget.gap_from', { date: gap.from })}
            </p>
          )}
          {sparkline.length > 1 && (
            <div className="mb-4">
              <Sparkline
                points={sparkline.map((value, index) => ({
                  label: String(index + 1),
                  value,
                }))}
                formatValue={formatMoney}
                width={320}
                height={48}
              />
            </div>
          )}
          {details}
        </Sheet>
      </>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-[420px] max-w-[92vw]">{details}</PopoverContent>
    </Popover>
  );
}
