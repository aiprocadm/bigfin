// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useKpiSummary,
  useKpiTargets,
  useDeleteKpiTarget,
} from '@/hooks/query/payroll';
import { KpiTargetDialog } from './KpiTargetDialog';

const fmt = (n: number | undefined | null) =>
  `${(n ?? 0).toLocaleString('ru-RU')} ₽`;

const fmtMonth = (value: string) => {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export function PayrollKpiTab() {
  const [month, setMonth] = React.useState<string>(currentMonth());
  const [showDialog, setShowDialog] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<any | null>(null);

  const year = Number(month.slice(0, 4)) || new Date().getFullYear();

  const { data: summary } = useKpiSummary(month, {});
  const { data: targets } = useKpiTargets({ year }, {});
  const deleteTarget = useDeleteKpiTarget({});

  const summaryRows: any[] = summary ?? [];
  const monthTargets: any[] = (targets ?? []).filter(
    (tg: any) => String(tg.periodMonth ?? '').slice(0, 7) === month,
  );

  const handleDelete = async (target: any) => {
    if (!window.confirm(intl.get('payroll.kpi.target.delete_confirm'))) return;
    try {
      await deleteTarget.mutateAsync(target.id);
      toast.success(intl.get('payroll.kpi.target.deleted'));
    } catch {
      toast.error(intl.get('payroll.kpi.target.delete_error'));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Month selector */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">
          {intl.get('payroll.kpi.month')}
        </span>
        <Input
          type="month"
          className="w-44"
          value={month}
          onChange={(e) => {
            if (e.target.value) setMonth(e.target.value);
          }}
        />
      </div>

      {/* Summary table */}
      <div className="rounded-md border">
        {summaryRows.length === 0 ? (
          <div className="text-muted-foreground p-4 text-sm">
            {intl.get('payroll.kpi.summary.empty')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">
                  {intl.get('payroll.kpi.col.manager')}
                </th>
                <th className="px-4 py-2 font-medium">
                  {intl.get('payroll.kpi.col.metric')}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {intl.get('payroll.kpi.col.target')}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {intl.get('payroll.kpi.col.fact')}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {intl.get('payroll.kpi.col.achievement')}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {intl.get('payroll.kpi.col.bonus')}
                </th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row) => (
                <tr
                  key={`${row.employeeId}-${row.metric}`}
                  className="border-b last:border-0"
                >
                  <td className="px-4 py-2 font-medium">{row.fullName}</td>
                  <td className="px-4 py-2">
                    {intl.get(`payroll.kpi.metric.${row.metric}`)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {fmt(row.targetAmount)}
                  </td>
                  <td className="px-4 py-2 text-right">{fmt(row.fact)}</td>
                  <td
                    className={`px-4 py-2 text-right ${
                      row.achievementPct != null && row.achievementPct < 100
                        ? 'text-red-600'
                        : ''
                    }`}
                  >
                    {row.achievementPct == null
                      ? '—'
                      : `${Math.round(row.achievementPct)}%`}
                  </td>
                  <td className="px-4 py-2 text-right">{fmt(row.bonus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Management-accounting hint */}
      <p className="text-muted-foreground text-xs">
        {intl.get('payroll.kpi.hint')}
      </p>

      {/* Targets of the month */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">
          {intl.get('payroll.kpi.targets.title')}
        </h2>
        <Button
          size="sm"
          onClick={() => {
            setEditTarget(null);
            setShowDialog(true);
          }}
        >
          {intl.get('payroll.kpi.target.add')}
        </Button>
      </div>
      <div className="flex flex-col divide-y rounded-md border">
        {monthTargets.length === 0 && (
          <div className="text-muted-foreground p-4 text-sm">
            {intl.get('payroll.kpi.targets.empty')}
          </div>
        )}
        {monthTargets.map((target) => (
          <div
            key={target.id}
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <div className="flex flex-col">
              <span className="font-medium">
                {target.employee?.fullName ?? `#${target.employeeId}`}
              </span>
              <span className="text-muted-foreground">
                {fmtMonth(target.periodMonth)} ·{' '}
                {intl.get(`payroll.kpi.metric.${target.metric}`)} ·{' '}
                {fmt(target.targetAmount)} · {target.bonusRate ?? 0}%
                {target.onlyIfAchieved
                  ? ` · ${intl.get('payroll.kpi.target.only_if_achieved')}`
                  : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditTarget(target);
                  setShowDialog(true);
                }}
              >
                {intl.get('payroll.kpi.target.edit')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(target)}
              >
                {intl.get('payroll.kpi.target.delete')}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {showDialog && (
        <KpiTargetDialog
          key={editTarget?.id ?? 'new'}
          target={editTarget ?? undefined}
          onDone={() => {
            setShowDialog(false);
            setEditTarget(null);
          }}
          onCancel={() => {
            setShowDialog(false);
            setEditTarget(null);
          }}
        />
      )}
    </div>
  );
}
