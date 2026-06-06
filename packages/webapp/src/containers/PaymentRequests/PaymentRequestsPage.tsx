// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import {
  usePaymentRequests,
  useApprovePaymentRequest,
  useRejectPaymentRequest,
  useCancelPaymentRequest,
} from '@/hooks/query/paymentRequests';
import { PaymentRequestDialog } from './PaymentRequestDialog';

type StatusFilter = '' | 'pending' | 'approved' | 'rejected' | 'cancelled';

const fmt = (n: number) => `${(n ?? 0).toLocaleString('ru-RU')} ₽`;

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: '', label: 'payment_requests.filter.all' },
  { key: 'pending', label: 'payment_requests.status.pending' },
  { key: 'approved', label: 'payment_requests.status.approved' },
  { key: 'rejected', label: 'payment_requests.status.rejected' },
];

export default function PaymentRequestsPage() {
  const { featureCan } = useFeatureCan();
  const [status, setStatus] = React.useState<StatusFilter>('');
  const [showForm, setShowForm] = React.useState(false);

  const { data: requests } = usePaymentRequests(status ? { status } : {}, {});
  const approve = useApprovePaymentRequest({});
  const reject = useRejectPaymentRequest({});
  const cancel = useCancelPaymentRequest({});

  if (!featureCan('payment_requests')) return null;

  const rows: any[] = requests ?? [];

  const act = async (mutation: any, id: number, okKey: string) => {
    try {
      await mutation.mutateAsync(id);
      toast.success(intl.get(okKey));
    } catch {
      toast.error(intl.get('payment_requests.action_error'));
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {intl.get('payment_requests.page_title')}
        </h1>
        <Button onClick={() => setShowForm(true)}>
          {intl.get('payment_requests.create')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.key || 'all'}
            variant={status === tab.key ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setStatus(tab.key)}
          >
            {intl.get(tab.label)}
          </Button>
        ))}
      </div>

      <div className="flex flex-col divide-y rounded-md border">
        {rows.length === 0 && (
          <div className="text-muted-foreground p-4 text-sm">
            {intl.get('payment_requests.empty')}
          </div>
        )}
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <div className="flex flex-col">
              <span className="font-medium">{fmt(r.amount)}</span>
              <span className="text-muted-foreground">
                {r.dueDate}
                {r.description ? ` · ${r.description}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {intl.get(`payment_requests.status.${r.status}`)}
              </span>
              {r.status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => act(approve, r.id, 'payment_requests.approved_ok')}
                  >
                    {intl.get('payment_requests.action.approve')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => act(reject, r.id, 'payment_requests.rejected_ok')}
                  >
                    {intl.get('payment_requests.action.reject')}
                  </Button>
                </>
              )}
              {(r.status === 'pending' || r.status === 'approved') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => act(cancel, r.id, 'payment_requests.cancelled_ok')}
                >
                  {intl.get('payment_requests.action.cancel')}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <PaymentRequestDialog
          onDone={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
