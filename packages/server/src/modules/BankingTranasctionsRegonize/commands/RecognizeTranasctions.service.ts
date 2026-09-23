import { Knex } from 'knex';
import { Inject, Injectable } from '@nestjs/common';
import { castArray, isEmpty } from 'lodash';
import { findMatchingRule } from '@/modules/BankRules/utils/matchRule';
import { ApplyBankRuleService, RuleApplyOutcome } from './ApplyBankRule.service';
import { RecognizeTransactionsCriteria } from '../_types';
import { BankRule } from '@/modules/BankRules/models/BankRule';
import { RecognizedBankTransaction } from '../models/RecognizedBankTransaction';
import { UncategorizedBankTransaction } from '@/modules/BankingTransactions/models/UncategorizedBankTransaction';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

@Injectable()
export class RecognizeTranasctionsService {
  constructor(
    @Inject(UncategorizedBankTransaction.name)
    private readonly uncategorizedCashflowTransactionModel: TenantModelProxy<
      typeof UncategorizedBankTransaction
    >,

    @Inject(RecognizedBankTransaction.name)
    private readonly recognizedBankTransactionModel: TenantModelProxy<
      typeof RecognizedBankTransaction
    >,

    @Inject(BankRule.name)
    private readonly bankRuleModel: TenantModelProxy<typeof BankRule>,

    private readonly applyBankRule: ApplyBankRuleService,
  ) {}

  /**
   * Marks the uncategorized transaction as recognized from the given bank rule.
   * @param {BankRule} bankRule -
   * @param {UncategorizedCashflowTransaction} transaction -
   * @param {Knex.Transaction} trx -
   */
  private async markBankRuleAsRecognized(
    bankRule: BankRule,
    transaction: UncategorizedBankTransaction,
    trx?: Knex.Transaction,
  ) {
    const recognizedTransaction = await this.recognizedBankTransactionModel()
      .query(trx)
      .insert({
        bankRuleId: bankRule.id,
        uncategorizedTransactionId: transaction.id,
        assignedCategory: bankRule.assignCategory,
        assignedAccountId: bankRule.assignAccountId,
        assignedPayee: bankRule.assignPayee,
        assignedMemo: bankRule.assignMemo,
      });

    await this.uncategorizedCashflowTransactionModel()
      .query(trx)
      .findById(transaction.id)
      .patch({
        recognizedTransactionId: recognizedTransaction.id,
      });
  }

  /**
   * Распознаёт строки выписки по автоправилам и, если `apply`, сразу
   * разносит их (FT-030…FT-032 ТЗ-3).
   *
   * ПРАВИЛА ИЩУТСЯ ОДНИМ ДВИЖКОМ `findMatchingRule` — тем же, что у
   * предпросмотра «применить к прошлым». Раньше правила раскладывались по
   * счетам, а кучка «для любого счёта» собиралась и не передавалась дальше:
   * такие правила не срабатывали никогда.
   *
   * `apply` включают только для НОВЫХ строк (импорт выписки). При создании
   * и правке правила строки лишь распознаются: разнести то, что уже лежит,
   * можно только явно — через предпросмотр с галочками (FT-034).
   *
   * @param {number|Array<number>} ruleId - The target rule id/ids.
   * @param {RecognizeTransactionsCriteria}
   * @param {Knex.Transaction} trx -
   */
  public async recognizeTransactions(
    ruleId?: number | Array<number>,
    transactionsCriteria?: RecognizeTransactionsCriteria,
    trx?: Knex.Transaction,
    options: { apply?: boolean } = {},
  ): Promise<{ recognized: number; outcomes: RuleApplyOutcome[] }> {
    const uncategorizedTranasctions =
      await this.uncategorizedCashflowTransactionModel()
        .query(trx)
        .onBuild((query) => {
          query.modify('notRecognized');
          query.modify('notCategorized');

          // Filter the transactions based on the given criteria.
          if (transactionsCriteria?.batch) {
            query.where('batch', transactionsCriteria.batch);
          }
          if (transactionsCriteria?.accountId) {
            query.where('accountId', transactionsCriteria.accountId);
          }
        });

    const bankRules = await this.bankRuleModel()
      .query(trx)
      .onBuild((q) => {
        const rulesIds = !isEmpty(ruleId) ? castArray(ruleId) : [];

        if (rulesIds?.length > 0) {
          q.whereIn('id', rulesIds);
        }
        q.withGraphFetched('conditions');
        q.withGraphFetched('splits');
        q.orderBy('order', 'asc');
      });

    const outcomes: RuleApplyOutcome[] = [];
    let recognized = 0;
    // По одной строке: разноска выдаёт номера операций по порядку, и
    // параллельные разноски спорили бы за один номер.
    for (const transaction of uncategorizedTranasctions) {
      const rule = findMatchingRule(bankRules as any[], transaction as any);
      if (!rule) continue;
      await this.markBankRuleAsRecognized(rule, transaction, trx);
      recognized += 1;
      if (options.apply) {
        outcomes.push(await this.applyBankRule.apply(rule, transaction));
      }
    }
    return { recognized, outcomes };
  }

  /**
   *
   * @param {number} uncategorizedTransaction
   */
  public async regonizeTransaction(
    uncategorizedTransaction: UncategorizedBankTransaction,
  ) {}
}

