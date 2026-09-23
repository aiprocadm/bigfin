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

const filterSelectClassName =
  'border-input bg-background h-9 rounded-control border px-3 text-sm';

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

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          {intl.get('payment_calendar.granularity')}
          <select
            className={filterSelectClassName}
            value={granularity}
            onChange={(event) =>
              setGranularity(event.target.value as typeof granularity)
            }
          >
            {['day', 'week', 'month', 'quarter', 'year'].map((value) => (
              <option key={value} value={value}>
                {intl.get(`payment_calendar.granularity.${value}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          {intl.get('payment_calendar.source')}
          <select
            className={filterSelectClassName}
            value={source}
            onChange={(event) =>
              setSource(event.target.value as typeof source)
            }
          >
            <option value="cashflow">
              {intl.get('payment_calendar.source.cashflow')}
            </option>
            <option value="pnl">
              {intl.get('payment_calendar.source.pnl')}
            </option>
          </select>
        </label>

        <Button variant="secondary" onClick={scrollToToday}>
          {intl.get('payment_calendar.today')}
        </Button>
      </div>

      {gap && (
        <div className="sticky top-0 z-10 flex flex-col gap-2 rounded-control bg-red-50 px-4 py-2 text-red-700">
          <span>
            ⚠{' '}
            {intl.get('payment_calendar.gap_warning', {
              days: gap.daysFromStart,
              amount: formatOrganizationMoney(gap.amount),
            })}
          </span>
          {/* «Что можно перенести» (FT-051 ТЗ-3). */}
          <GapScenariosPanel />
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {intl.get('payment_calendar.page_title')}
        </h1>
        {/* Три горизонта и кнопка «Добавить плановую операцию» в строку на
            телефоне не помещаются: ряд занимал 544 px при экране 390.
            Переносим (И2 карты v33). */}
        <div className="flex flex-wrap items-center gap-2">
          {(['list', 'matrix'] as const).map((mode) => (
            <Button
              key={mode}
              variant={view === mode ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setView(mode)}
            >
              {intl.get(`payment_calendar.view.${mode}`)}
            </Button>
          ))}
          {(['week', 'month', 'quarter'] as const).map((h) => (
            <Button
              key={h}
              variant={horizon === h ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setHorizon(h)}
            >
              {intl.get(`payment_calendar.horizon.${h}`)}
            </Button>
          ))}
          <Button
            onClick={() => {
              setEditing(undefined);
              setShowForm(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {intl.get('payment_calendar.add')}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          {(['all', 'inflow', 'outflow'] as const).map((d) => (
            <Button
              key={d}
              variant={direction === d ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setDirection(d)}
            >
              {d === 'all'
                ? intl.get('payment_calendar.filter.all')
                : intl.get(`payment_calendar.direction.${d}`)}
            </Button>
          ))}
        </div>
        <select
          className={filterSelectClassName}
          aria-label={intl.get('payment_calendar.field.account')}
          value={accountId == null ? '' : String(accountId)}
          onChange={(e) =>
            setAccountId(
              e.target.value === '' ? null : Number(e.target.value),
            )
          }
        >
          <option value="">
            {intl.get('payment_calendar.filter.all_accounts')}
          </option>
          {((accounts ?? []) as AccountRow[]).map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.code ? `${acc.code} — ${acc.name}` : acc.name}
            </option>
          ))}
        </select>
      </div>
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
          : days.map((day: any) => (
              /* Якорь сегодняшнего дня: к нему возвращает «На сегодня». */
              <div
                key={day.date}
                ref={day.date === fromDate ? todayRef : undefined}
              >
                <DayRow
                  day={day}
                  onMaterialize={handleMaterialize}
                  foundOperationId={foundOperationId}
                />
              </div>
            ))}
      </div>
    </div>
  );
}
