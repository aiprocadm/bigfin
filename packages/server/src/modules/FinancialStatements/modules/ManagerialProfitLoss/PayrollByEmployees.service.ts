// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';

import { Features } from '@/common/types/Features';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { PayrollRun } from '@/modules/Payroll/models/PayrollRun.model';
import { PayrollRunLine } from '@/modules/Payroll/models/PayrollRunLine.model';
import { Employee } from '@/modules/Payroll/models/Employee.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ReportPeriod } from '../CashFlowArticles/periodizeRows';
import { EmployeePayroll } from './payrollByEmployees';
import { PnlBasis } from './ManagerialPnlSource.service';

/** Группировка ФОТ в настройках ОПиУ (FT-014 ТЗ-3). */
export const PAYROLL_GROUPINGS = ['articles', 'employees'] as const;
export type PayrollGrouping = (typeof PAYROLL_GROUPINGS)[number];

/**
 * Почему раскрытие не сделано — экран говорит это словами:
 * - `no_access` — модуль «Зарплата» выключен (право на модуль, FT-014);
 * - `no_article` — в настройках зарплаты не выбрана статья;
 * - `grouping` — отчёт раскрыт до направлений, а расчёт направления не знает;
 * - `legal_entity` — отбор по юрлицу, а сотрудник к юрлицу не привязан:
 *   показать всех значило бы показать людей чужой организации.
 */
export type PayrollGroupingStatus =
  | 'off'
  | 'applied'
  | 'no_access'
  | 'no_article'
  | 'grouping'
  | 'legal_entity';

export interface PayrollByEmployeesResult {
  mode: PayrollGrouping;
  status: PayrollGroupingStatus;
  payrollArticleId: number | null;
  byPeriod: EmployeePayroll[][];
  roster: Array<{ employeeId: number; name: string }>;
}

interface SettingsReader {
  get(query: { group: string; key: string }, defaultValue?: any): any;
}

export function readPayrollGrouping(store: SettingsReader | null | undefined): PayrollGrouping {
  const value = store?.get({ group: 'managerial_pnl', key: 'payroll_grouping' });
  return value === 'employees' ? 'employees' : 'articles';
}

const dayOf = (value: unknown) => moment(value as any).format('YYYY-MM-DD');

/**
 * Выплаты сотрудникам из УТВЕРЖДЁННЫХ расчётов по колонкам отчёта.
 * По начислению расчёт стоит в своём месяце, по деньгам — в дату выплаты.
 */
@Injectable()
export class PayrollByEmployeesService {
  constructor(
    private readonly featuresManager: FeaturesManager,

    @Inject(PayrollRun.name)
    private readonly runModel: TenantModelProxy<typeof PayrollRun>,

    @Inject(PayrollRunLine.name)
    private readonly lineModel: TenantModelProxy<typeof PayrollRunLine>,

    @Inject(Employee.name)
    private readonly employeeModel: TenantModelProxy<typeof Employee>,
  ) {}

  public async load(input: {
    settings: SettingsReader;
    periods: ReportPeriod[];
    basis: PnlBasis;
    group: string;
    legalEntityIds?: number[];
  }): Promise<PayrollByEmployeesResult> {
    const mode = readPayrollGrouping(input.settings);
    const payrollArticleId =
      Number(input.settings.get({ group: 'payroll', key: 'payroll_article_id' })) || null;
    const empty = (status: PayrollGroupingStatus): PayrollByEmployeesResult => ({
      mode,
      status,
      payrollArticleId,
      byPeriod: input.periods.map(() => []),
      roster: [],
    });

    if (mode !== 'employees') return empty('off');
    if (!(await this.featuresManager.accessible(Features.PAYROLL))) return empty('no_access');
    if (!payrollArticleId) return empty('no_article');
    if (input.group !== 'articles') return empty('grouping');
    if ((input.legalEntityIds ?? []).length > 0) return empty('legal_entity');
    if (input.periods.length === 0) return empty('applied');

    const from = input.periods[0].fromDate;
    const to = input.periods[input.periods.length - 1].toDate;
    const dateField = input.basis === 'accrual' ? 'periodMonth' : 'payDate';

    const runs: any[] = await this.runModel()
      .query()
      .modify('approvedOnly')
      .where(dateField, '>=', from)
      .where(dateField, '<=', to);
    const lines: any[] = runs.length
      ? await this.lineModel().query().whereIn('runId', runs.map((run) => run.id))
      : [];
    const employeeIds = [...new Set(lines.map((line) => line.employeeId))];
    const employees: any[] = employeeIds.length
      ? await this.employeeModel()
          .query()
          .whereIn('id', employeeIds)
          .select(['id', 'fullName'])
      : [];
    const nameOf = new Map<number, string>(
      employees.map((employee) => [employee.id, employee.fullName]),
    );

    const dateOfRun = new Map<number, string>(
      runs.map((run) => [run.id, dayOf(run[dateField])]),
    );
    const byPeriod: EmployeePayroll[][] = input.periods.map(() => []);
    lines.forEach((line) => {
      const date = dateOfRun.get(line.runId);
      const index = input.periods.findIndex(
        (period) => period.fromDate <= date && date <= period.toDate,
      );
      if (index < 0) return;
      byPeriod[index].push({
        employeeId: line.employeeId,
        name: nameOf.get(line.employeeId) ?? `№ ${line.employeeId}`,
        amount: Number(line.netAmount) || 0,
      });
    });

    const roster = employeeIds
      .map((employeeId) => ({
        employeeId,
        name: nameOf.get(employeeId) ?? `№ ${employeeId}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    return { mode, status: 'applied', payrollArticleId, byPeriod, roster };
  }
}
