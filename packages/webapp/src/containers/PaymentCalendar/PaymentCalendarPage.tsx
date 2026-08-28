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
import type { ForecastLine } from './mapForecast';
import { PlannedOperationDialog } from './PlannedOperationDialog';
import { PlannedOperation } from './schemas';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { ModuleDisabled } from '@/components/ui/module-disabled';

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
  'border-input bg-background h-9 rounded-md border px-3 text-sm';

export default function PaymentCalendarPage() {
  const { featureCan } = useFeatureCan();
  const [horizon, setHorizon] = React.useState<'week' | 'month' | 'quarter'>(
    'month',
  );
  const [direction, setDirection] = React.useState<
    'all' | 'inflow' | 'outflow'
  >('all');
  const [accountId, setAccountId] = React.useState<number | null>(null);
  const [showForm, setShowForm] = React.useState(false);
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
    },
    {},
  );

  if (!featureCan('payment_calendar')) return <ModuleDisabled />;

  const days = data?.days ?? [];
  const gap = data?.gap ?? null;

  return (
    <div className="flex flex-col gap-4 p-6">
      {gap && (
        <div className="sticky top-0 z-10 rounded-md bg-red-50 px-4 py-2 text-red-700">
          ⚠{' '}
          {intl.get('payment_calendar.gap_warning', {
            days: gap.daysFromStart,
            amount: formatOrganizationMoney(gap.amount),
          })}
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
      <div className="flex flex-col">
        {days.map((day: any) => (
          <DayRow key={day.date} day={day} onMaterialize={handleMaterialize} />
        ))}
      </div>
    </div>
  );
}
