import React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useFeatureCan } from '@/hooks/state/feature';
import { usePaymentCalendar } from '@/hooks/query/paymentCalendar';
import { DayRow } from './DayRow';
import { PlannedOperationDialog } from './PlannedOperationDialog';
import { PlannedOperation } from './schemas';

export default function PaymentCalendarPage() {
  const { featureCan } = useFeatureCan();
  const [horizon, setHorizon] = React.useState<'week' | 'month' | 'quarter'>(
    'month',
  );
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<PlannedOperation | undefined>();

  const fromDate = moment().format('YYYY-MM-DD');
  const toDate = moment()
    .add(1, horizon === 'week' ? 'week' : horizon === 'quarter' ? 'quarter' : 'month')
    .format('YYYY-MM-DD');

  const { data } = usePaymentCalendar({ fromDate, toDate }, {});

  if (!featureCan('payment_calendar')) return null;

  const days = data?.days ?? [];
  const gap = data?.gap ?? null;

  return (
    <div className="flex flex-col gap-4 p-6">
      {gap && (
        <div className="sticky top-0 z-10 rounded-md bg-red-50 px-4 py-2 text-red-700">
          ⚠{' '}
          {intl.get('payment_calendar.gap_warning', {
            days: gap.daysFromStart,
            amount: `${gap.amount.toLocaleString('ru-RU')} ₽`,
          })}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {intl.get('payment_calendar.page_title')}
        </h1>
        <div className="flex items-center gap-2">
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
          <DayRow key={day.date} day={day} />
        ))}
      </div>
    </div>
  );
}
