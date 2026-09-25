import React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { Intent } from '@blueprintjs/core';
import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useFeatureCan } from '@/hooks/state/feature';
import {
  usePaymentCalendar,
  useMaterializePlannedOperation,
} from '@/hooks/query/paymentCalendar';
import { useAccounts } from '@/hooks/query/accounts';
import { DayRow } from './DayRow';
import { PeriodRow, daysOfPeriod } from './PeriodRow';
import type { ForecastLine } from './mapForecast';
import { PlannedOperationDialog } from './PlannedOperationDialog';
import { PlannedOperation } from './schemas';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { ModuleDisabled } from '@/components/ui/module-disabled';
import { useLocation } from 'react-router-dom';
import { openIdFromSearch } from '@/containers/UniversalSearch/openFromSearch';
import { usePlannedOperationsTruncated } from '@/hooks/query/paymentCalendar';
import { ListTruncated } from '@/components/ui/list-truncated';
import { CalendarMatrixView } from './CalendarMatrixView';
import { GapScenariosPanel } from './GapScenariosPanel';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BalanceByDayChart } from './BalanceByDayChart';
import { groupQuietDays, type CalendarListItem } from './quietDays';
import { formatDay } from './formatDay';

// Деловые ошибки материализации → понятный текст (О3 карты v13).
const MATERIALIZE_ERROR_KEYS: Record<string, string> = {
  PLAN_HAS_NO_ACCOUNT: 'payment_calendar.materialize_error.no_account',
  PLAN_HAS_NO_ARTICLE: 'payment_calendar.materialize_error.no_article',
  ARTICLE_HAS_NO_SUITABLE_ACCOUNT:
    'payment_calendar.materialize_error.article_no_account',
  ARTICLE_ACCOUNT_AMBIGUOUS:
    'payment_calendar.materialize_error.article_ambiguous',
};

interface AccountRow {
  id: number;
  name: string;
  code?: string;
}


export default function PaymentCalendarPage() {
  const { search } = useLocation();

  // Карта v48. Календарь не открывает операцию отдельным экраном — он
  // показывает её среди соседних дней. Найденную поиском выделяем и
  // подводим к ней экран.
  const foundOperationId = openIdFromSearch(search);

  // С2 карты v49. Календарь не молчит о том, что показал не все операции.
  const { data: truncated } = usePlannedOperationsTruncated({});
  const { featureCan } = useFeatureCan();
  const [horizon, setHorizon] = React.useState<'week' | 'month' | 'quarter'>(
    'month',
  );
  const [direction, setDirection] = React.useState<
    'all' | 'inflow' | 'outflow'
  >('all');
  const [accountId, setAccountId] = React.useState<number | null>(null);
  /**
   * Масштаб столбцов и система координат (FIN-019 ТЗ-2).
   *
   * На узком экране дневной масштаб не помещается — там по умолчанию
   * недели. Молча показать дни значило бы отдать человеку таблицу, которую
   * он не может прочитать.
   */
  const isNarrow =
    typeof window !== 'undefined' && window.innerWidth < 640;
  const [granularity, setGranularity] = React.useState<
    'day' | 'week' | 'month' | 'quarter' | 'year'
  >(isNarrow ? 'week' : 'day');
  const [source, setSource] = React.useState<'cashflow' | 'pnl'>('cashflow');
  const todayRef = React.useRef<HTMLDivElement | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  // Второй взгляд на те же деньги — матрица «план / факт» (FT-050 ТЗ-3).
  const [view, setView] = React.useState<'list' | 'matrix'>('list');
  const [editing, setEditing] = React.useState<PlannedOperation | undefined>();

  const fromDate = moment().format('YYYY-MM-DD');
  const toDate = moment()
    .add(1, horizon === 'week' ? 'week' : horizon === 'quarter' ? 'quarter' : 'month')
    .format('YYYY-MM-DD');

  const { data: accounts } = useAccounts({}, {});
  const { mutateAsync: materializeOperation } =
    useMaterializePlannedOperation();

  const handleMaterialize = React.useCallback(
    (line: ForecastLine, date: string) => {
      if (line.plannedOperationId == null) return;
      materializeOperation({ id: line.plannedOperationId, date })
        .then(() => {
          AppToaster.show({
            message: intl.get('payment_calendar.materialized'),
            intent: Intent.SUCCESS,
          });
        })
        .catch((error: any) => {
          const type = error?.response?.data?.errors?.[0]?.type;
          AppToaster.show({
            message: intl.get(
              MATERIALIZE_ERROR_KEYS[type] ?? 'something_wentwrong',
            ),
            intent: Intent.DANGER,
          });
        });
    },
    [materializeOperation],
  );
  const { data } = usePaymentCalendar(
    {
      fromDate,
      toDate,
      ...(direction !== 'all' ? { direction } : {}),
      ...(accountId != null ? { accountId } : {}),
      granularity,
      source,
    },
    {},
  );

  if (!featureCan('payment_calendar')) return <ModuleDisabled />;

  const days = data?.days ?? [];
  const gap = data?.gap ?? null;
  // КЛЕТКИ КРУПНЕЕ ДНЯ. Раньше витрина читала только дни, и переключатель
  // масштаба не менял НИЧЕГО: сервер честно считал периоды, а показать их
  // было некому.
  const periods = data?.periods ?? [];
  const byPeriods = granularity !== 'day' && periods.length > 0;

  /**
   * «На сегодня» — прокрутка к текущему дню.
   *
   * Календарь открывается на горизонте вперёд, и человек, пролистав его,
   * теряет точку отсчёта. Кнопка возвращает её одним нажатием.
   */
  const scrollToToday = () => {
    todayRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const selectTrigger = 'w-full';

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Заголовок — первым (UI-050-1 ТЗ-4): выборы «Отображение /
          Источник» стояли над заголовком (O10). Одна главная кнопка —
          «Добавить плановую операцию». */}
      <PageHeader
        className="mb-0"
        title={intl.get('payment_calendar.page_title')}
        action={
          <Button
            onClick={() => {
              setEditing(undefined);
              setShowForm(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {intl.get('payment_calendar.add')}
          </Button>
        }
      />

      <FilterBar
        activeCount={(granularity !== (isNarrow ? 'week' : 'day') ? 1 : 0) + (source !== 'cashflow' ? 1 : 0) + (accountId != null ? 1 : 0)}
        onReset={() => {
          setGranularity(isNarrow ? 'week' : 'day');
          setSource('cashflow');
          setAccountId(null);
        }}
        filters={
          <>
            <label className="flex flex-col gap-1 text-subhead text-text-secondary">
              {intl.get('payment_calendar.granularity')}
              <Select value={granularity} onValueChange={(value) => setGranularity(value as typeof granularity)}>
                <SelectTrigger className={selectTrigger}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['day', 'week', 'month', 'quarter', 'year'] as const).map((value) => (
                    <SelectItem key={value} value={value}>
                      {intl.get(`payment_calendar.granularity.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-subhead text-text-secondary">
              {intl.get('payment_calendar.source')}
              <Select value={source} onValueChange={(value) => setSource(value as typeof source)}>
                <SelectTrigger className={selectTrigger}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashflow">{intl.get('payment_calendar.source.cashflow')}</SelectItem>
                  <SelectItem value="pnl">{intl.get('payment_calendar.source.pnl')}</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-subhead text-text-secondary">
              {intl.get('payment_calendar.field.account')}
              <Select
                value={accountId == null ? 'all' : String(accountId)}
                onValueChange={(value) => setAccountId(value === 'all' ? null : Number(value))}
              >
                <SelectTrigger className={selectTrigger}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{intl.get('payment_calendar.filter.all_accounts')}</SelectItem>
                  {((accounts ?? []) as AccountRow[]).map((acc) => (
                    <SelectItem key={acc.id} value={String(acc.id)}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </>
        }
        trailing={
          <Button variant="ghost" onClick={scrollToToday}>
            {intl.get('payment_calendar.today')}
          </Button>
        }
      >
        <SegmentedControl
          aria-label={intl.get('payment_calendar.view.aria')}
          value={view}
          onChange={setView}
          options={(['list', 'matrix'] as const).map((mode) => ({
            value: mode,
            label: intl.get(`payment_calendar.view.${mode}`),
          }))}
        />
        <SegmentedControl
          aria-label={intl.get('payment_calendar.horizon.aria')}
          value={horizon}
          onChange={setHorizon}
          options={(['week', 'month', 'quarter'] as const).map((h) => ({
            value: h,
            label: intl.get(`payment_calendar.horizon.${h}`),
          }))}
        />
        <SegmentedControl
          aria-label={intl.get('payment_calendar.direction.aria')}
          value={direction}
          onChange={setDirection}
          options={(['all', 'inflow', 'outflow'] as const).map((d) => ({
            value: d,
            label:
              d === 'all'
                ? intl.get('payment_calendar.filter.all')
                : intl.get(`payment_calendar.direction.${d}`),
          }))}
        />
      </FilterBar>

      {gap && (
        // Разрыв — плашкой цвета проблемы из токенов (была палитра Tailwind
        // «на месте»), без прилипания: над ней теперь прилипает шапка.
        <div className="flex flex-col gap-2 rounded-control bg-danger/10 px-4 py-2 text-danger">
          <span>
            {intl.get('payment_calendar.gap_warning', {
              days: gap.daysFromStart,
              amount: formatOrganizationMoney(gap.amount),
            })}
          </span>
          {/* «Что можно перенести» (FT-051 ТЗ-3). */}
          <GapScenariosPanel />
        </div>
      )}

      {/* Остаток по дням (C11) — над списком, только в дневном масштабе:
          у периодов свой вид. */}
      {view === 'list' && !byPeriods && days.length > 1 && <BalanceByDayChart days={days} />}
      {showForm && (
        <PlannedOperationDialog
          key={editing?.id ?? 'new'}
          operation={editing}
          onDone={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}
      {truncated && <ListTruncated shown={days.length} />}

      {view === 'matrix' && <CalendarMatrixView accountId={accountId} />}

      <div className={view === 'matrix' ? 'hidden' : 'flex flex-col'}>
        {byPeriods
          ? periods.map((period: any) => (
              /* Якорь текущего периода: к нему возвращает «На сегодня». */
              <div
                key={period.from}
                ref={period.from <= fromDate && period.to >= fromDate ? todayRef : undefined}
              >
                <PeriodRow
                  period={period}
                  days={daysOfPeriod(days, period)}
                  onMaterialize={handleMaterialize}
                />
              </div>
            ))
          : groupQuietDays(days, fromDate).map((item) =>
              item.kind === 'quiet' ? (
                <QuietDaysRow key={item.from} item={item} />
              ) : (
                /* Якорь сегодняшнего дня: к нему возвращает «На сегодня». */
                <div
                  key={item.day.date}
                  ref={item.day.date === fromDate ? todayRef : undefined}
                >
                  <DayRow
                    day={item.day}
                    onMaterialize={handleMaterialize}
                    foundOperationId={foundOperationId}
                  />
                </div>
              ),
            )}
      </div>
    </div>
  );
}

/**
 * Свёрнутые тихие дни: «5 дней без движения · 26–30 сент.», по нажатию —
 * раскрываются теми же строками дней (O10).
 */
function QuietDaysRow({ item }: { item: Extract<CalendarListItem, { kind: 'quiet' }> }) {
  const [open, setOpen] = React.useState(false);
  if (open) {
    return (
      <>
        {item.days.map((day) => (
          <DayRow key={day.date} day={day} />
        ))}
      </>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex w-full items-center justify-between border-0 border-b border-border bg-transparent px-2 py-2 text-left text-subhead text-text-muted hover:bg-fill-1"
    >
      <span>
        {intl.get('payment_calendar.quiet_days', { count: item.days.length })} · {formatDay(item.from)} – {formatDay(item.to)}
      </span>
      <span>{formatOrganizationMoney(item.days[item.days.length - 1].balance)}</span>
    </button>
  );
}
