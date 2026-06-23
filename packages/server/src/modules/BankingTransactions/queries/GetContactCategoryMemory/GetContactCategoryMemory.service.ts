import { Inject, Injectable } from '@nestjs/common';
import {
  ContactMemory,
  pickContactMemory,
  toFormTransactionType,
} from './pickContactMemory';
import { BankTransaction } from '@/modules/BankingTransactions/models/BankTransaction';
import { getCashflowTransactionType } from '@/modules/BankingTransactions/utils';
import {
  CASHFLOW_DIRECTION,
  CASHFLOW_TRANSACTION_TYPE,
} from '@/modules/BankingTransactions/constants';
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
   *
   * История фильтруется по направлению операции: для прихода берутся только
   * прошлые приходы контрагента, для расхода — расходы. Иначе подставилась бы
   * статья/тип чужого направления (контрагент мог быть и приходом, и расходом).
   *
   * @param {number | null | undefined} contactId — контрагент.
   * @param {CASHFLOW_DIRECTION | null} direction — направление текущей операции.
   */
  public async getForContact(
    contactId: number | null | undefined,
    direction: CASHFLOW_DIRECTION | null = null,
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

    const sameDirection = direction
      ? (rows as any[]).filter(
          (row) =>
            getCashflowTransactionType(
              row.transactionType as CASHFLOW_TRANSACTION_TYPE,
            )?.direction === direction,
        )
      : (rows as any[]);

    const memory = pickContactMemory(sameDirection);
    if (!memory) return null;

    return {
      creditAccountId: memory.creditAccountId,
      transactionType: toFormTransactionType(memory.transactionType),
    };
  }
}
