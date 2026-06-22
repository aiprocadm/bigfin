import { Inject, Injectable } from '@nestjs/common';
import {
  ContactMemory,
  pickContactMemory,
} from './pickContactMemory';
import { BankTransaction } from '@/modules/BankingTransactions/models/BankTransaction';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

/**
 * Память по контрагенту: из истории подтверждённых денежных операций берёт
 * статью (`creditAccountId`) и тип, которые пользователь в последний раз выбирал
 * для этого контрагента. Учится на подтверждениях — отдельной таблицы не нужно.
 */
@Injectable()
export class GetContactCategoryMemoryService {
  constructor(
    @Inject(BankTransaction.name)
    private readonly bankTransactionModel: TenantModelProxy<
      typeof BankTransaction
    >,
  ) {}

  /**
   * Возвращает память по контрагенту или null, если истории нет.
   * @param {number | null | undefined} contactId — контрагент.
   */
  public async getForContact(
    contactId: number | null | undefined,
  ): Promise<ContactMemory | null> {
    if (!contactId) return null;

    const rows = await this.bankTransactionModel()
      .query()
      .where('contactId', contactId)
      .whereNotNull('creditAccountId')
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')
      .limit(20)
      .select('creditAccountId', 'transactionType');

    return pickContactMemory(rows as any);
  }
}
