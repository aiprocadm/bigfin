// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { DealProgressBars } from './DealProgressBars';
import { toast } from 'sonner';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeals, useDealsSummary, useDeleteDeal } from '@/hooks/query/deals';
import { useEmployees } from '@/hooks/query/payroll';
import { DealDialog } from './DealDialog';
import { DealProfitability } from './DealProfitability';
import { DealStagesSection } from './DealStagesSection';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { EmptyState } from '@/components/ui/empty-state';
import { useHistory, useLocation } from 'react-router-dom';
import { openIdFromSearch } from '@/containers/UniversalSearch/openFromSearch';
import { ModuleDisabled } from '@/components/ui/module-disabled';
import { useDealsTruncated } from '@/hooks/query/deals';
import { ListTruncated } from '@/components/ui/list-truncated';

type StatusFilter = '' | 'in_progress' | 'completed' | 'cancelled';

const fmt = (n: number) => formatOrganizationMoney(n ?? 0);
const pct = (n: number) => `${Math.round((n ?? 0) * 100)}%`;

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: '', label: 'deals.filter.all' },
  { key: 'in_progress', label: 'deals.status.in_progress' },
  { key: 'completed', label: 'deals.status.completed' },
  { key: 'cancelled', label: 'deals.status.cancelled' },
];

export default function DealsPage() {
  const { search } = useLocation();
  const history = useHistory();
  const { featureCan } = useFeatureCan();
  const [status, setStatus] = React.useState<StatusFilter>('');
  const [editing, setEditing] = React.useState<any | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [openDeal, setOpenDeal] = React.useState<any | null>(null);

  const canDeals = featureCan('deals');
  // Сотрудников отдаёт «Зарплата»: без неё запрос вернёт 403, и пользователь
  // увидит на «Сделках» ложное «нет прав» (М2 карты v15).
  const canKpi = featureCan('payroll_kpi') && featureCan('payroll');

  // Запросы стоят выше раннего return: без `enabled` они уходят на сервер и
  // при выключенном модуле, а он теперь честно отвечает 403.
  const { data: deals } = useDeals(status ? { status } : {}, {
    enabled: canDeals,
  });
  const { data: summary } = useDealsSummary({}, { enabled: canDeals });
  const { data: employees } = useEmployees({}, { enabled: canKpi });
  const del = useDeleteDeal({});

  if (!canDeals) return <ModuleDisabled />;

  const managerNameById = new Map<number, string>(
    ((employees as any[]) ?? []).map((e: any) => [e.id, e.fullName]),
  );

  const rows: any[] = deals ?? [];

  // С2 карты v49. Список не молчит о том, что показал не всё.
  const { data: truncated } = useDealsTruncated(status ? { status } : {});

  // Карта v43. Поиск в шапке приводит сюда с номером найденной сделки в
  // адресе. Без этого человек попадал бы в общий список и искал глазами
  // второй раз.
  const requestedId = openIdFromSearch(search);
  const requestedDeal =
    requestedId !== null ? rows.find((d: any) => d.id === requestedId) : null;
  const shownDeal = openDeal ?? requestedDeal ?? null;

  // Закрыть карточку — значит убрать и номер из адреса: иначе карточка,
  // открытая поиском, возвращалась бы сразу после закрытия.
  const closeDeal = () => {
    setOpenDeal(null);
    if (requestedId !== null) history.replace('/deals');
  };
  const marginById = new Map<number, any>(
    ((summary as any)?.deals ?? []).map((d: any) => [d.id, d]),
  );
  const totals = (summary as any)?.totals ?? { revenue: 0, costs: 0, profit: 0 };
  const top = ((summary as any)?.deals ?? []).slice(0, 3);

  const onDelete = async (id: number) => {
    try {
      await del.mutateAsync(id);
      toast.success(intl.get('deals.deleted_ok'));
    } catch {
      toast.error(intl.get('deals.delete_error'));
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{intl.get('deals.page_title')}</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          {intl.get('deals.create')}
        </Button>
      </div>

      {/* Дашборд */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {intl.get('deals.dashboard.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm">
          <div>
            {intl.get('deals.dashboard.profit')}:{' '}
            <span className="font-medium">{fmt(totals.profit)}</span>
          </div>
          <div>
            {intl.get('deals.dashboard.revenue')}:{' '}
            <span className="font-medium">{fmt(totals.revenue)}</span>
          </div>
          <div className="text-muted-foreground">
            {intl.get('deals.dashboard.top_by_profit')}:{' '}
            {top.map((d: any) => d.name).join(' · ') || '—'}
          </div>
        </CardContent>
      </Card>

      {/* Табы статуса */}
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

      {/* Список */}
      <div className="flex flex-col divide-y rounded-control border">
        {rows.length === 0 && (
          <EmptyState
            title={intl.get('deals.empty_status.title')}
            description={intl.get('deals.empty_status.description')}
          />
        )}
        {truncated && <ListTruncated shown={rows.length} />}
        {rows.map((d) => {
          const m = marginById.get(d.id);
          return (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <button
                className="flex flex-col text-left"
                onClick={() => setOpenDeal(d)}
              >
                <span className="font-medium">{d.name}</span>
                <span className="text-muted-foreground">
                  {intl.get(`deals.status.${d.status}`)}
                  {d.deadline ? ` · ${d.deadline}` : ''}
                </span>
              </button>
              <div className="flex items-center gap-4">
                {/* «Оплачено» и «Отгружено» (FIN-024). Доли приходят тем же
                    ответом, что и сам список: отдельный запрос на строку
                    означал бы запрос на каждую сделку страницы. */}
                <DealProgressBars
                  paidRatio={d.paidRatio}
                  shippedRatio={d.shippedRatio}
                  flags={d.flags}
                  className="hidden sm:flex"
                />
                {m && (
                  <span className="text-muted-foreground">
                    {fmt(m.profit)} · {pct(m.margin)}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(d);
                    setShowForm(true);
                  }}
                >
                  {intl.get('deals.action.edit')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(d.id)}>
                  {intl.get('deals.action.delete')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {shownDeal && (
        <div className="mt-2">
          {canKpi && shownDeal.managerId != null && (
            <div className="text-muted-foreground mb-2 text-sm">
              {intl.get('deal.manager')}:{' '}
              <span className="text-foreground font-medium">
                {managerNameById.get(shownDeal.managerId) ??
                  `#${shownDeal.managerId}`}
              </span>
            </div>
          )}
          <DealProfitability deal={shownDeal} />
          <DealStagesSection dealId={shownDeal.id} />
          <div className="mt-2">
            <Button variant="ghost" size="sm" onClick={closeDeal}>
              {intl.get('deals.close')}
            </Button>
          </div>
        </div>
      )}

      {showForm && (
        <DealDialog
          deal={editing}
          onDone={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
