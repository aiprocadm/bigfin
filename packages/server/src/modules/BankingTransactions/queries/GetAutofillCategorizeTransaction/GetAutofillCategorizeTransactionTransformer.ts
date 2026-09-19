import { sumBy } from 'lodash';
import { Transformer } from '@/modules/Transformer/Transformer';

export class GetAutofillCategorizeTransctionTransformer extends Transformer {
  /**
   * Included attributes to the object.
   * @returns {Array}
   */
  public includeAttributes = (): string[] => {
    return [
      'amount',
      'formattedAmount',
      'isRecognized',
      'date',
      'formattedDate',
      'creditAccountId',
      'debitAccountId',
      'referenceNo',
      'description',
      'transactionType',
      'recognizedByRuleId',
      'recognizedByRuleName',
      'isWithdrawalTransaction',
      'isDepositTransaction',
      'payeeInn',
      'payee',
      'suggestedContactId',
      'suggestedByContact',
    ];
  };

  /**
   * Detarmines whether the transaction is recognized.
   * @returns {boolean}
   */
  public isRecognized() {
    return !!this.options.firstUncategorizedTransaction?.recognizedTransaction;
  }

  /**
   * Retrieves the total amount of uncategorized transactions.
   * @returns {number}
   */
  public amount() {
    return sumBy(this.options.uncategorizedTransactions, 'amount');
  }

  /**
   * Retrieves the formatted total amount of uncategorized transactions.
   * @returns {string}
   */
  public formattedAmount() {
    return this.formatNumber(this.amount(), {
      currencyCode: 'USD',
      money: true,
    });
  }

  /**
   * Detarmines whether the transaction is deposit.
   * @returns {boolean}
   */
  public isDepositTransaction() {
    const amount = this.amount();

    return amount > 0;
  }

  /**
   * Detarmines whether the transaction is withdrawal.
   * @returns {boolean}
   */
  public isWithdrawalTransaction() {
    const amount = this.amount();

    return amount < 0;
  }

  /**
   *
   * @param {string}
   */
  public date() {
    return this.options.firstUncategorizedTransaction?.date || null;
  }

  /**
   * Retrieves the formatted date of uncategorized transaction.
   * @returns {string}
   */
  public formattedDate() {
    return this.formatDate(this.date());
  }

  /**
   *
   * @param {string}
   */
  public referenceNo() {
    return this.options.firstUncategorizedTransaction?.referenceNo || null;
  }

  /**
   * Назначение платежа.
   *
   * ДОБАВЛЕНО: именно по нему человек и решает, к какой статье отнести
   * операцию. В списке «Ждут разноски» назначение видно, а в окне разноса
   * его не было — приходилось помнить строку, которую только что закрыл
   * собой же открытый ящик.
   * @returns {string|null}
   */
  public description() {
    return this.options.firstUncategorizedTransaction?.description || null;
  }

  /**
   * Статья по умолчанию: распознанное правило → память по контрагенту → пусто.
   * @returns {number}
   */
  public creditAccountId() {
    return (
      this.options.firstUncategorizedTransaction?.recognizedTransaction
        ?.assignedAccountId ||
      this.options.contactMemory?.creditAccountId ||
      null
    );
  }

  /**
   *
   * @returns {number}
   */
  public debitAccountId() {
    return this.options.firstUncategorizedTransaction?.accountId || null;
  }

  /**
   * Retrieves the assigned category of recognized transaction, if is not recognized
   * returns the default transaction type depends on the transaction normal.
   * @returns {string}
   */
  public transactionType() {
    const assignedCategory =
      this.options.firstUncategorizedTransaction?.recognizedTransaction
        ?.assignedCategory;

    return (
      assignedCategory ||
      this.options.contactMemory?.transactionType ||
      (this.isDepositTransaction() ? 'other_income' : 'other_expense')
    );
  }

  /**
   *
   * @returns {string}
   */
  public payee() {
    return (
      this.options.firstUncategorizedTransaction?.recognizedTransaction
        ?.assignedPayee ||
      this.options.firstUncategorizedTransaction?.payee ||
      null
    );
  }

  /**
   * Retrieves the INN of the counterparty from the uncategorized transaction.
   * @returns {string | null}
   */
  public payeeInn() {
    return this.options.firstUncategorizedTransaction?.payeeInn || null;
  }

  /**
   * Контрагент, найденный по ИНН выписки (для авто-подстановки в форму «Разбор»).
   * @returns {number | null}
   */
  public suggestedContactId() {
    return this.options.suggestedContactId || null;
  }

  /**
   * Признак, что статья подставлена из памяти по контрагенту (а не правилом).
   * @returns {boolean}
   */
  public suggestedByContact() {
    const recognized =
      !!this.options.firstUncategorizedTransaction?.recognizedTransaction;

    return (
      !recognized && !!this.options.contactMemory?.creditAccountId
    );
  }

  /**
   *
   * @returns {string}
   */
  public memo() {
    return (
      this.options.firstUncategorizedTransaction?.recognizedTransaction
        ?.assignedMemo || null
    );
  }

  /**
   * Retrieves the rule id the transaction recongized by.
   * @returns {string}
   */
  public recognizedByRuleId() {
    return (
      this.options.firstUncategorizedTransaction?.recognizedTransaction
        ?.bankRuleId || null
    );
  }

  /**
   * Retrieves the rule name the transaction recongized by.
   * @returns {string}
   */
  public recognizedByRuleName() {
    return (
      this.options.firstUncategorizedTransaction?.recognizedTransaction
        ?.bankRule?.name || null
    );
  }
}
