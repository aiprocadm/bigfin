// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  usePayrollRun,
  useEditPayrollRun,
  useApprovePayrollRun,
  useUnapprovePayrollRun,
  useDeletePayrollRun,
} from '@/hooks/query/payroll';

interface Props {
  runId: number;
  onClose: () => void;
}

const fmt = (n: number | undefined | null) =>
  `${(n ?? 0).toLocaleString('ru-RU')} ₽`;

function formatPeriod(periodMonth: string) {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(periodMonth));
  } catch {
    return periodMonth;
  }
}

export function PayrollRunDetail({ runId, onClose }: Props) {
  const { data: run } = usePayrollRun(runId);
  const editRun = useEditPayrollRun({});
  const approveRun = useApprovePayrollRun({});
  const unapproveRun = useUnapprovePayrollRun({});
  const deleteRun = useDeletePayrollRun({});

  const [lines, setLines] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (run?.lines) {
      setLines(
        run.lines.map((l: any) => ({
          ...l,
          baseAmount: l.baseAmount ?? 0,
          bonusAmount: l.bonusAmount ?? 0,
          deductionAmount: l.deductionAmount ?? 0,
        })),
      );
    }
  }, [run]);

  if (!run) {
    return (
      <div className="p-6 text-sm text-muted-foreground">...</div>
    );
  }

  const isDraft = run.status === 'draft';

  const updateLine = (idx: number, field: string, value: number) => {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    );
  };

  const act = async (mutation: any, args: any, okKey: string, afterOk?: () => void) => {
    try {
      await mutation.mutateAsync(args);
      toast.success(intl.get(okKey));
      if (afterOk) afterOk();
    } catch {
      toast.error(intl.get('payroll.run.action_error'));
    }
  };

  const handleSaveLines = () => {
    act(
      editRun,
      {
        id: runId,
        values: {
          lines: lines.map((l) => ({
            employeeId: l.employee?.id ?? l.employeeId,
            baseAmount: l.baseAmount,
            bonusAmount: l.bonusAmount,
            deductionAmount: l.deductionAmount,
          })),
        },
      },
      'payroll.run.saved',
    );
  };

  const handleApprove = () => {
    act(approveRun, runId, 'payroll.run.approved_ok');
  };

  const handleUnapprove = () => {
    act(unapproveRun, runId, 'payroll.run.unapproved_ok');
  };

  const handleDelete = () => {
    if (!window.confirm(intl.get('payroll.run.delete_confirm'))) return;
    act(deleteRun, runId, 'payroll.run.deleted', onClose);
  };

  const totals = run.totals ?? {};

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">
            {formatPeriod(run.periodMonth)}
          </h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {intl.get(`payroll.status.${run.status}`)}
            </span>
            <span>
              {intl.get('payroll.run.pay_date')}: {run.payDate}
            </span>
            {run.taxDate && (
              <span>
                {intl.get('payroll.run.tax_date')}: {run.taxDate}
              </span>
            )}
          </div>
        </div>
        <Button variant="ghost" onClick={onClose}>
          {intl.get('payroll.cancel')}
        </Button>
      </div>

      {/* Lines table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">{intl.get('payroll.employee.full_name')}</th>
              <th className="pb-2 pr-3 font-medium">{intl.get('payroll.employee.employment_type')}</th>
              <th className="pb-2 pr-3 font-medium">{intl.get('payroll.run.col.base')}</th>
              <th className="pb-2 pr-3 font-medium">{intl.get('payroll.run.col.bonus')}</th>
              <th className="pb-2 pr-3 font-medium">{intl.get('payroll.run.col.deduction')}</th>
              <th className="pb-2 pr-3 font-medium text-muted-foreground">{intl.get('payroll.run.col.ndfl')}</th>
              <th className="pb-2 pr-3 font-medium text-muted-foreground">{intl.get('payroll.run.col.contributions')}</th>
              <th className="pb-2 pr-3 font-medium">{intl.get('payroll.run.col.net')}</th>
              <th className="pb-2 font-medium">{intl.get('payroll.run.col.total_cost')}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={line.id ?? idx} className="border-b last:border-0">
                <td className="py-2 pr-3">{line.employee?.fullName ?? '—'}</td>
                <td className="py-2 pr-3 text-muted-foreground">
                  {intl.get(`payroll.employment_type.${line.employee?.employmentType ?? line.employmentType ?? 'staff'}`)}
                </td>
                <td className="py-2 pr-3">
                  {isDraft ? (
                    <Input
                      type="number"
                      className="h-7 w-24"
                      value={line.baseAmount}
                      onChange={(e) =>
                        updateLine(idx, 'baseAmount', Number(e.target.value))
                      }
                    />
                  ) : (
                    fmt(line.baseAmount)
                  )}
                </td>
                <td className="py-2 pr-3">
                  {isDraft ? (
                    <Input
                      type="number"
                      className="h-7 w-24"
                      value={line.bonusAmount}
                      onChange={(e) =>
                        updateLine(idx, 'bonusAmount', Number(e.target.value))
                      }
                    />
                  ) : (
                    fmt(line.bonusAmount)
                  )}
                </td>
                <td className="py-2 pr-3">
                  {isDraft ? (
                    <Input
                      type="number"
                      className="h-7 w-24"
                      value={line.deductionAmount}
                      onChange={(e) =>
                        updateLine(idx, 'deductionAmount', Number(e.target.value))
                      }
                    />
                  ) : (
                    fmt(line.deductionAmount)
                  )}
                </td>
                <td className="py-2 pr-3 text-muted-foreground">
                  {fmt(line.ndflAmount)}
                </td>
                <td className="py-2 pr-3 text-muted-foreground">
                  {fmt(line.contributionsAmount)}
                </td>
                <td className="py-2 pr-3">{fmt(line.netAmount)}</td>
                <td className="py-2">{fmt(line.totalCost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-semibold">
              <td className="pt-2 pr-3" colSpan={2}>
                {intl.get('payroll.totals')}
              </td>
              <td className="pt-2 pr-3">{fmt(totals.totalGross)}</td>
              <td className="pt-2 pr-3" />
              <td className="pt-2 pr-3" />
              <td className="pt-2 pr-3 text-muted-foreground">{fmt(totals.totalNdfl)}</td>
              <td className="pt-2 pr-3 text-muted-foreground">{fmt(totals.totalContributions)}</td>
              <td className="pt-2 pr-3">{fmt(totals.totalNet)}</td>
              <td className="pt-2">{fmt(totals.totalCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isDraft && (
          <>
            <Button onClick={handleSaveLines}>
              {intl.get('payroll.run.save_lines')}
            </Button>
            <Button variant="ghost" onClick={handleApprove}>
              {intl.get('payroll.run.approve')}
            </Button>
            <Button variant="ghost" onClick={handleDelete}>
              {intl.get('payroll.run.delete')}
            </Button>
          </>
        )}
        {!isDraft && (
          <Button variant="ghost" onClick={handleUnapprove}>
            {intl.get('payroll.run.unapprove')}
          </Button>
        )}
      </div>
    </div>
  );
}
