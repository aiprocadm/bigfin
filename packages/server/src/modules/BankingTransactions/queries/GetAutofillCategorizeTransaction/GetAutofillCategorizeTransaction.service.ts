import { Inject, Injectable } from '@nestjs/common';
import { castArray, first, uniq } from 'lodash';
import { GetAutofillCategorizeTransctionTransformer } from './GetAutofillCategorizeTransactionTransformer';
import { GetContactCategoryMemoryService } from '../GetContactCategoryMemory/GetContactCategoryMemory.service';
import { UncategorizedBankTransaction } from '@/modules/BankingTransactions/models/UncategorizedBankTransaction';
import { TransformerInjectable } from '@/modules/Transformer/TransformerInjectable.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { GetContactByInnService } from '@/modules/Contacts/queries/GetContactByInn.service';

@Injectable()
export class GetAutofillCategorizeTransactionService {
  constructor(
    private readonly transformer: TransformerInjectable,
    private readonly getContactByInn: GetContactByInnService,
    private readonly contactCategoryMemory: GetContactCategoryMemoryService,

    @Inject(UncategorizedBankTransaction.name)
    private readonly uncategorizedBankTransactionModel: TenantModelProxy<
      typeof UncategorizedBankTransaction
    >,
  ) {}

  /**
   * Retrieves the autofill values of categorize transactions form.
   * @param {Array<number> | number} uncategorizeTransactionsId - Uncategorized transactions ids.
   */
  public async getAutofillCategorizeTransaction(
    uncategorizeTransactionsId: Array<number> | number,
  ) {
    const uncategorizeTransactionsIds = uniq(
      castArray(uncategorizeTransactionsId),
    );
    const uncategorizedTransactions =
      await this.uncategorizedBankTransactionModel()
        .query()
        .whereIn('id', uncategorizeTransactionsIds)
        .withGraphFetched('recognizedTransaction.assignAccount')
        .withGraphFetched('recognizedTransaction.bankRule')
        .throwIfNotFound();

    const firstUncategorizedTransaction = first(uncategorizedTransactions);

    // Память по контрагенту и авто-подстановка контрагента по ИНН вмешиваются
    // только когда строка НЕ распознана правилом — правило всегда главнее.
    const { suggestedContactId, contactMemory } =
      await this.resolveContactSuggestions(firstUncategorizedTransaction);

    return this.transformer.transform(
      {},
      new GetAutofillCategorizeTransctionTransformer(),
      {
        uncategorizedTransactions,
        firstUncategorizedTransaction,
        suggestedContactId,
        contactMemory,
      },
    );
  }

  /**
   * Резолвит контрагента по ИНН и память по нему для нераспознанной операции.
   * @param {UncategorizedBankTransaction | undefined} transaction
   */
  private async resolveContactSuggestions(transaction: any) {
    const empty = { suggestedContactId: null, contactMemory: null };

    if (!transaction || transaction.recognizedTransaction) return empty;

    const contact = await this.getContactByInn.getByInn(transaction.payeeInn);
    if (!contact) return empty;

    const contactMemory = await this.contactCategoryMemory.getForContact(
      contact.id,
    );

    return { suggestedContactId: contact.id, contactMemory };
  }
}
