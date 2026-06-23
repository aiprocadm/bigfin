import { Inject, Injectable } from '@nestjs/common';
import { uniq } from 'lodash';
import { format1CExport } from './format1CExport';
import { Parsed1CDocument } from '@/modules/BankStatementImport/utils/parse1CStatement';
import { BankTransaction } from '@/modules/BankingTransactions/models/BankTransaction';
import { getCashflowTransactionType } from '@/modules/BankingTransactions/utils';
import {
  CASHFLOW_DIRECTION,
  CASHFLOW_TRANSACTION_TYPE,
} from '@/modules/BankingTransactions/constants';
import { Account } from '@/modules/Accounts/models/Account.model';
import { Contact } from '@/modules/Contacts/models/Contact';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

/**
 * Выгрузка денежных операций Bigfin за период в формат `1CClientBankExchange`
 * (㉑/⑩) — для загрузки в 1С-бухгалтерию. Направление операции определяет, кто
 * плательщик, а кто получатель (наш счёт vs контрагент).
 */
@Injectable()
export class GetOnecExportService {
  constructor(
    @Inject(BankTransaction.name)
    private readonly bankTransactionModel: TenantModelProxy<typeof BankTransaction>,
    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
    @Inject(Contact.name)
    private readonly contactModel: TenantModelProxy<typeof Contact>,
  ) {}

  /**
   * @param {number} accountId — денежный счёт Bigfin.
   * @param {string} from — ISO-дата.
   * @param {string} to — ISO-дата.
   * @returns {Promise<string>} текст 1CClientBankExchange.
   */
  public async export(
    accountId: number,
    from: string,
    to: string,
  ): Promise<string> {
    const account = await this.accountModel().query().findById(accountId);
    const ourName = account?.name || '';
    const ourAccountNo = account?.code || String(accountId);

    const txns = await this.bankTransactionModel()
      .query()
      .where('cashflowAccountId', accountId)
      .where('date', '>=', from)
      .where('date', '<=', to)
      .orderBy('date', 'asc');

    const contactIds = uniq(
      txns.map((t: any) => t.contactId).filter(Boolean),
    ) as number[];
    const contacts = contactIds.length
      ? await this.contactModel().query().whereIn('id', contactIds)
      : [];
    const contactById = new Map<number, any>(
      contacts.map((c: any) => [c.id, c]),
    );

    const documents: Parsed1CDocument[] = txns.map((t: any) =>
      this.toDocument(t, ourName, ourAccountNo, contactById),
    );

    return format1CExport(ourAccountNo, documents);
  }

  /** Маппит денежную операцию в 1С-документ (направление → плательщик/получатель). */
  private toDocument(
    t: any,
    ourName: string,
    ourAccountNo: string,
    contactById: Map<number, any>,
  ): Parsed1CDocument {
    const meta = getCashflowTransactionType(
      t.transactionType as CASHFLOW_TRANSACTION_TYPE,
    );
    const isIn = meta?.direction === CASHFLOW_DIRECTION.IN;
    const contact = t.contactId ? contactById.get(t.contactId) : null;
    const contactName = contact?.displayName || '';
    const contactInn = contact?.inn || '';

    return {
      docNumber: t.transactionNumber || t.referenceNo || String(t.id),
      date: String(t.date).slice(0, 10),
      amount: Math.abs(Number(t.amount) || 0),
      payerAccountNumber: isIn ? '' : ourAccountNo,
      payeeAccountNumber: isIn ? ourAccountNo : '',
      payerName: isIn ? contactName : ourName,
      payerInn: isIn ? contactInn : '',
      payeeName: isIn ? ourName : contactName,
      payeeInn: isIn ? '' : contactInn,
      purpose: t.description || '',
    };
  }
}
