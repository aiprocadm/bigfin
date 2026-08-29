import { Inject, Injectable } from '@nestjs/common';
import { Exportable } from '@/modules/Export/Exportable';
import { exportRowsLimit } from '@/modules/Export/exportRowsLimit';
import { ExportableService } from '@/modules/Export/decorators/ExportableModel.decorator';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { BankTransaction } from '../models/BankTransaction';

/**
 * Экспорт денежных (банковских) операций (С2 карты v14).
 * До этого операции были единственным списком, который нельзя забрать.
 */
@Injectable()
@ExportableService({ name: BankTransaction.name })
export class BankTransactionsExportable extends Exportable {
  constructor(
    @Inject(BankTransaction.name)
    private readonly bankTransactionModel: TenantModelProxy<
      typeof BankTransaction
    >,
  ) {
    super();
  }

  /**
   * Retrieves the bank transactions data to exportable sheet.
   */
  public async exportable(query: Record<string, unknown>): Promise<any> {
    return this.bankTransactionModel()
      .query()
      .withGraphFetched('[cashflowAccount, creditAccount]')
      .orderBy('date', 'desc')
      .limit(exportRowsLimit() + 1);
  }
}
