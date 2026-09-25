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
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { EmptyState } from '@/components/ui/empty-state';
import { ModuleDisabled } from '@/components/ui/module-disabled';
import { useLocation } from 'react-router-dom';
import { openIdFromSearch } from '@/containers/UniversalSearch/openFromSearch';
import {
  usePaymentRequestsTotals,
  usePaymentRequestsTruncated,
  useSubmitPaymentRequest,
} from '@/hooks/query/paymentRequests';
import { formattedAmount } from '@/utils';
import { ListTruncated } from '@/components/ui/list-truncated';
import { PageTitle } from '@/components/ui/page-title';

type StatusFilter = '' | 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';

const fmt = (n: number) => formatOrganizationMoney(n ?? 0);

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: '', label: 'payment_requests.filter.all' },
  // Черновики (FT-053 ТЗ-3).
  { key: 'draft', label: 'payment_requests.status.draft' },
  { key: 'pending', label: 'payment_requests.status.pending' },
  { key: 'approved', label: 'payment_requests.status.approved' },
  { key: 'rejected', label: 'payment_requests.status.rejected' },
];

export default function PaymentRequestsPage() {
  const { featureCan } = useFeatureCan();
  const [status, setStatus] = React.useState<StatusFilter>('');
  const [showForm, setShowForm] = React.useState(false);
  const { search } = useLocation();

  // Карта v43. У заявки нет своей карточки — реестр показывает их списком.
  // Поэтому найденную поиском заявку не «открываем», а выделяем среди
  // соседних: иначе человек попадал бы в общий список и искал глазами
  // второй раз.
  const foundId = openIdFromSearch(search);

  const { data: requests } = usePaymentRequests(status ? { status } : {}, {});
  const approve = useApprovePaymentRequest({});
  const reject = useRejectPaymentRequest({});
  const cancel = useCancelPaymentRequest({});
  const submit = useSubmitPaymentRequest();

  // С2 карты v49. Список не молчит о том, что показал не всё. Хук стоит ДО
  // раннего выхода: раньше он вызывался после него, и при выключении модуля
  // число хуков менялось между отрисовками — React падает на таком.
  const { data: truncated } = usePaymentRequestsTruncated(status ? { status } : {});
  // Итоги по каждой валюте (FT-053 ТЗ-3).
  const { data: totals } = usePaymentRequestsTotals(status ? { status } : {});

  if (!featureCan('payment_requests')) return <ModuleDisabled />;

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
        <PageTitle>
          {intl.get('payment_requests.page_title')}
        </PageTitle>
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

      {(totals ?? []).length > 0 && (
        <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
          {(totals ?? []).map((total: any) => (
            <span key={total.currencyCode ?? total.currency_code}>
              {intl.get('payment_requests.totals', {
                amount: formattedAmount(total.amount, total.currencyCode ?? total.currency_code),
                count: total.count,
              })}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col divide-y rounded-control border">
        {rows.length === 0 && (
          <EmptyState
            title={intl.get('payment_requests.empty_status.title')}
            description={intl.get('payment_requests.empty_status.description')}
          />
        )}
        {truncated && <ListTruncated shown={rows.length} />}
        {rows.map((r) => (
          <div
            key={r.id}
            ref={(node) =>
              r.id === foundId && node?.scrollIntoView({ block: 'center' })
            }
            className={
              'flex items-center justify-between gap-3 px-4 py-3 text-sm' +
              (r.id === foundId ? ' ring-2 ring-action rounded-control' : '')
            }
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
              {r.status === 'draft' && (
                <Button size="sm" onClick={() => act(submit, r.id, 'payment_requests.submitted_ok')}>
                  {intl.get('payment_requests.action.submit')}
                </Button>
              )}
              {(r.status === 'draft' || r.status === 'pending' || r.status === 'approved') && (
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
