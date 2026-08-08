// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DataQualityQueryDto } from '../dtos/DataQualityQuery.dto';
import {
  findUnbalancedJournals,
  UnbalancedJournalsResult,
} from '../utils/findUnbalancedJournals';
import { MAX_UNBALANCED_JOURNALS } from '../constants';

/**
 * «Несходящиеся проводки»: документы, у которых дебет не равен кредиту.
 *
 * Двойная запись — основа учёта, и её нарушение перекашивает баланс ровно
 * на разницу. Пока запись журнала не проверяла равенство, такие перекосы
 * оседали молча: приёмка нашла два (списание ОС и счёт с НДС), но сколько
 * их в базе — до этого отчёта увидеть было нечем.
 */
@Injectable()
export class GetUnbalancedJournalsService {
  constructor(
    @Inject(AccountTransaction.name)
    private readonly accountTransactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,
  ) {}

  public async getUnbalancedJournals(
    query: DataQualityQueryDto,
  ): Promise<UnbalancedJournalsResult> {
    const rows = await this.accountTransactionModel()
      .query()
      .onBuild((qb) => {
        qb.select([
          'referenceType',
          'referenceId',
          'date',
          'credit',
          'debit',
          'transactionNumber',
          'referenceNumber',
        ]);
        if (query.fromDate || query.toDate) {
          qb.modify('filterDateRange', query.fromDate, query.toDate);
        }
      });

    return findUnbalancedJournals(rows as any[], MAX_UNBALANCED_JOURNALS);
  }
}
