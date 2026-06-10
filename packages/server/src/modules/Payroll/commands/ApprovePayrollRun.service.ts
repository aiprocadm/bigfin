// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import * as moment from 'moment';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { PlannedOperation } from '@/modules/PaymentCalendar/models/PlannedOperation.model';
import { PayrollRun } from '../models/PayrollRun.model';
import { PayrollRunLine } from '../models/PayrollRunLine.model';
import { ERRORS, PAYROLL_CURRENCY, PAYROLL_SOURCE } from '../constants';
import { summarizeRun } from '../utils/summarizeRun';
import { payrollTaxDate } from '../utils/payrollTaxDate';
import { PayrollSettingsService } from '../PayrollSettings.service';

@Injectable()
export class ApprovePayrollRunService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly payrollSettings: PayrollSettingsService,

    @Inject(PayrollRun.name)
    private readonly runModel: TenantModelProxy<typeof PayrollRun>,

    @Inject(PayrollRunLine.name)
    private readonly lineModel: TenantModelProxy<typeof PayrollRunLine>,

    @Inject(PlannedOperation.name)
    private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}

  /**
   * Проводит начисление: статус approved + до 3 плановых оттоков в календаре
   * (выплата на дату выплаты; НДФЛ и взносы — на 28-е следующего месяца).
   */
  public async approve(id: number) {
    const settings = await this.payrollSettings.getSettings();

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const run: any = await this.runModel().query(trx).findById(id);
      if (!run) throw new ServiceError(ERRORS.PAYROLL_RUN_NOT_FOUND);
      if (run.status !== 'draft') {
        throw new ServiceError(ERRORS.PAYROLL_RUN_NOT_DRAFT);
      }
      const lines: any[] = await this.lineModel()
        .query(trx)
        .where('runId', id);
      const totals = summarizeRun(lines);

      const period = moment(run.periodMonth).format('MM.YYYY');
      const taxDate = payrollTaxDate(run.periodMonth);

      const operations = [
        {
          amount: totals.totalNet,
          plannedDate: moment(run.payDate).format('YYYY-MM-DD'),
          articleId: settings.payrollArticleId,
          description: `Зарплата за ${period}`,
        },
        {
          amount: totals.totalNdfl,
          plannedDate: taxDate,
          articleId: settings.taxesArticleId,
          description: `НДФЛ за ${period}`,
        },
        {
          amount: totals.totalContributions,
          plannedDate: taxDate,
          articleId: settings.taxesArticleId,
          description: `Страховые взносы за ${period}`,
        },
      ].filter((op) => op.amount > 0);

      for (const op of operations) {
        await this.operationModel()
          .query(trx)
          .insert({
            direction: 'outflow',
            amount: op.amount,
            currencyCode: PAYROLL_CURRENCY,
            plannedDate: op.plannedDate,
            articleId: op.articleId,
            status: 'confirmed',
            sourceType: PAYROLL_SOURCE,
            sourceId: run.id,
            description: op.description,
          } as any);
      }
      await this.runModel()
        .query(trx)
        .findById(id)
        .patch({ status: 'approved' } as any);

      return this.runModel().query(trx).findById(id);
    });
  }
}
