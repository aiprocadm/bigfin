// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import {
  usePayrollRuns,
  usePayrollTaxesSummary,
  useEmployees,
  useDeleteEmployee,
} from '@/hooks/query/payroll';
import { EmployeeDialog } from './EmployeeDialog';
import { PayrollRunDialog } from './PayrollRunDialog';
import { PayrollSettingsDialog } from './PayrollSettingsDialog';
import { PayrollRunDetail } from './PayrollRunDetail';

type TabKey = 'runs' | 'employees';

const fmt = (n: number | undefined | null) =>
  `${(n ?? 0).toLocaleString('ru-RU')} ₽`;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'runs', label: 'payroll.tab.runs' },
  { key: 'employees', label: 'payroll.tab.employees' },
];

export default function PayrollPage() {
  const { featureCan } = useFeatureCan();
  const [tab, setTab] = React.useState<TabKey>('runs');
  const [showRunDialog, setShowRunDialog] = React.useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = React.useState(false);
  const [showEmployeeDialog, setShowEmployeeDialog] = React.useState(false);
  const [editEmployee, setEditEmployee] = React.useState<any | null>(null);
  const [openRunId, setOpenRunId] = React.useState<number | null>(null);

  const year = new Date().getFullYear();

  const { data: runs } = usePayrollRuns({ year }, {});
  const { data: taxesSummary } = usePayrollTaxesSummary(year, {});
  const { data: employees } = useEmployees({}, {});
  const deleteEmployee = useDeleteEmployee({});

  if (!featureCan('payroll')) return null;

  const runRows: any[] = runs ?? [];
  const employeeRows: any[] = employees ?? [];
  const taxRows: any[] = taxesSummary ?? [];

  const handleDeleteEmployee = async (emp: any) => {
    if (!window.confirm(intl.get('payroll.employee.delete_confirm'))) return;
    try {
      await deleteEmployee.mutateAsync(emp.id);
      toast.success(intl.get('payroll.employee.deleted'));
    } catch (err: any) {
      const body = err?.response?.data;
      const code: string =
        typeof body === 'object' && body !== null
          ? body.code ?? body.error ?? ''
          : String(body ?? '');
      if (
        code === 'EMPLOYEE_HAS_PAYROLL_LINES' ||
        JSON.stringify(body ?? '').includes('EMPLOYEE_HAS_PAYROLL_LINES')
      ) {
        toast.error(intl.get('payroll.employee.has_lines_error'));
      } else {
        toast.error(intl.get('payroll.employee.save_error'));
      }
    }
  };

  if (openRunId !== null) {
    return (
      <PayrollRunDetail
        runId={openRunId}
        onClose={() => setOpenRunId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {intl.get('payroll.page_title')}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => setShowSettingsDialog(true)}
          >
            {intl.get('payroll.settings.open')}
          </Button>
          {tab === 'runs' && (
            <Button onClick={() => setShowRunDialog(true)}>
              {intl.get('payroll.run.create')}
            </Button>
          )}
          {tab === 'employees' && (
            <Button
              onClick={() => {
                setEditEmployee(null);
                setShowEmployeeDialog(true);
              }}
            >
              {intl.get('payroll.employee.add')}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1">
        {TABS.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setTab(t.key)}
          >
            {intl.get(t.label)}
          </Button>
        ))}
      </div>

      {/* Runs tab */}
      {tab === 'runs' && (
        <>
          <div className="flex flex-col divide-y rounded-md border">
            {runRows.length === 0 && (
              <div className="text-muted-foreground p-4 text-sm">
                {intl.get('payroll.runs.empty')}
              </div>
            )}
            {runRows.map((r) => (
              <div
                key={r.id}
                className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40"
                onClick={() => setOpenRunId(r.id)}
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {(() => {
                      try {
                        return new Intl.DateTimeFormat('ru-RU', {
                          month: 'long',
                          year: 'numeric',
                        }).format(new Date(r.periodMonth));
                      } catch {
                        return r.periodMonth;
                      }
                    })()}
                  </span>
                  <span className="text-muted-foreground">
                    {intl.get(`payroll.status.${r.status}`)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div className="flex flex-col">
                    <span className="font-medium">{fmt(r.totals?.totalNet)}</span>
                    <span className="text-muted-foreground text-xs">
                      {intl.get('payroll.run.col.net')}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span>{fmt(r.totals?.totalNdfl)}</span>
                    <span className="text-muted-foreground text-xs">
                      {intl.get('payroll.run.col.ndfl')}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span>{fmt(r.totals?.totalContributions)}</span>
                    <span className="text-muted-foreground text-xs">
                      {intl.get('payroll.run.col.contributions')}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span>{fmt(r.totals?.totalCost)}</span>
                    <span className="text-muted-foreground text-xs">
                      {intl.get('payroll.run.col.total_cost')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Taxes summary */}
          <div className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">
              {intl.get('payroll.taxes.title')}
            </h2>
            <div className="rounded-md border">
              {taxRows.length === 0 ? (
                <div className="text-muted-foreground p-4 text-sm">
                  {intl.get('payroll.taxes.empty')}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-4 py-2 font-medium">
                        {intl.get('payroll.taxes.month')}
                      </th>
                      <th className="px-4 py-2 font-medium">
                        {intl.get('payroll.taxes.ndfl')}
                      </th>
                      <th className="px-4 py-2 font-medium">
                        {intl.get('payroll.taxes.contributions')}
                      </th>
                      <th className="px-4 py-2 font-medium">
                        {intl.get('payroll.taxes.total')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxRows.map((row) => (
                      <tr key={row.month} className="border-b last:border-0">
                        <td className="px-4 py-2">{row.month}</td>
                        <td className="px-4 py-2">{fmt(row.ndfl)}</td>
                        <td className="px-4 py-2">{fmt(row.contributions)}</td>
                        <td className="px-4 py-2">{fmt(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Employees tab */}
      {tab === 'employees' && (
        <div className="flex flex-col divide-y rounded-md border">
          {employeeRows.length === 0 && (
            <div className="text-muted-foreground p-4 text-sm">
              {intl.get('payroll.employees.empty')}
            </div>
          )}
          {employeeRows.map((emp) => (
            <div
              key={emp.id}
              className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40"
              onClick={() => {
                setEditEmployee(emp);
                setShowEmployeeDialog(true);
              }}
            >
              <div className="flex flex-col">
                <span className="font-medium">{emp.fullName}</span>
                <span className="text-muted-foreground">
                  {emp.position
                    ? `${emp.position} · `
                    : ''}
                  {intl.get(`payroll.employment_type.${emp.employmentType}`)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span>{fmt(emp.defaultSalary)}</span>
                <span className="text-muted-foreground">
                  {emp.active
                    ? intl.get('payroll.employee.active')
                    : intl.get('payroll.employee.archived')}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteEmployee(emp);
                  }}
                >
                  {intl.get('payroll.employee.delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      {showRunDialog && (
        <PayrollRunDialog
          onDone={() => setShowRunDialog(false)}
          onCancel={() => setShowRunDialog(false)}
        />
      )}
      {showSettingsDialog && (
        <PayrollSettingsDialog
          onDone={() => setShowSettingsDialog(false)}
          onCancel={() => setShowSettingsDialog(false)}
        />
      )}
      {showEmployeeDialog && (
        <EmployeeDialog
          employee={editEmployee ?? undefined}
          onDone={() => {
            setShowEmployeeDialog(false);
            setEditEmployee(null);
          }}
          onCancel={() => {
            setShowEmployeeDialog(false);
            setEditEmployee(null);
          }}
        />
      )}
    </div>
  );
}
