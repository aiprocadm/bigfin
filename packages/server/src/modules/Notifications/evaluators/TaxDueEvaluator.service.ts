// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { GetTaxEstimateService } from '@/modules/Dashboard/queries/GetTaxEstimate.service';
import { Candidate } from '../utils/selectToFire';
import { taxDueDecide, DEFAULT_TAX_DUE_DAYS } from './taxDueDecide';

/**
 * Н4 карты v22. Напоминание о сроке уплаты налога.
 *
 * Оценку спрашиваем у той же службы, что показывает плитку на главной, —
 * второго способа считать налог быть не должно. Если оценки нет (не
 * упрощёнка, режим не задан, отчёт недоступен), напоминать не о чем.
 */
@Injectable()
export class TaxDueEvaluatorService {
  constructor(private readonly taxEstimate: GetTaxEstimateService) {}

  public async evaluate(threshold: any): Promise<Candidate[]> {
    const daysBefore =
      Number(threshold?.daysBefore) >= 0
        ? Number(threshold.daysBefore)
        : DEFAULT_TAX_DUE_DAYS;

    const today = moment().format('YYYY-MM-DD');
    const estimate = await this.taxEstimate.getTaxEstimate(today);

    return taxDueDecide(estimate, today, daysBefore);
  }
}
