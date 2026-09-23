// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';

import { BankTransaction } from '@/modules/BankingTransactions/models/BankTransaction';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DataQualityQueryDto } from '../dtos/DataQualityQuery.dto';
import { findAccrualShifts } from '../utils/findAccrualShifts';

/**
 * «Месяц начисления вне периода» (FT-013 ТЗ-3): денежные операции, из-за
 * которых отчёт о деньгах и отчёт о прибыли за период расходятся.
 * Без периода — текущий год.
 */
@Injectable()
export class GetAccrualShiftsService {
  constructor(
    @Inject(BankTransaction.name)
    private readonly bankTransactionModel: TenantModelProxy<typeof BankTransaction>,
  ) {}

  public async getAccrualShifts(query: DataQualityQueryDto) {
    const fromDate = moment(query.fromDate ?? moment().startOf('year')).format('YYYY-MM-DD');
    const toDate = moment(query.toDate ?? moment().endOf('year')).format('YYYY-MM-DD');

    const rows: any[] = await this.bankTransactionModel()
      .query()
      .whereNotNull('accrualPeriod')
      // Корзина (FT-042 ТЗ-3): удалённое не показывается и не считается.
      .modify('notDeleted')
      .select(['id', 'date', 'accrualPeriod', 'transactionNumber', 'amount', 'description']);

    return { fromDate, toDate, ...findAccrualShifts(rows, fromDate, toDate) };
  }
}
