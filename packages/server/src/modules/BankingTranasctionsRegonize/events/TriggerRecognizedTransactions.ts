import { isEqual, omit } from 'lodash';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { events } from '@/common/events/events';
import {
  IBankRuleEventCreatedPayload,
  IBankRuleEventDeletedPayload,
  IBankRuleEventEditedPayload,
} from '@/modules/BankRules/types';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  RecognizeUncategorizedTransactionsJob,
  RecognizeUncategorizedTransactionsJobPayload,
  RecognizeUncategorizedTransactionsQueue,
} from '../_types';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { runAfterTransaction } from '@/modules/Tenancy/TenancyDB/TransactionsHooks';
import { IUncategorizedTransactionCreatedEventPayload } from '@/modules/BankingCategorize/types/BankingCategorize.types';

/** Окно склейки задач «разнести новые строки» по одному счёту, мс. */
export const APPLY_RULES_WINDOW_MS = 10_000;

/**
 * Номер задачи «разнести новые строки счёта»: один на организацию, счёт и
 * окно времени. Импорт на 300 строк шлёт 300 сигналов — очередь по
 * одинаковому номеру примет из них одну задачу.
 *
 * Окно в номере обязательно: готовые задачи хранятся сутки, и номер без
 * времени молча отверг бы следующий импорт того же счёта до завтра.
 */
export const applyRulesJobId = (
  organizationId: string,
  accountId: number,
  now: number,
) =>
  `apply-rules:${organizationId}:${accountId}:${Math.floor(now / APPLY_RULES_WINDOW_MS)}`;

@Injectable()
export class TriggerRecognizedTransactionsSubscriber {
  constructor(
    private readonly tenancyContect: TenancyContext,

    @InjectQueue(RecognizeUncategorizedTransactionsQueue)
    private readonly recognizeTransactionsQueue: Queue,
  ) {}

  /**
   * Triggers the recognize uncategorized transactions job on rule created.
   * @param {IBankRuleEventCreatedPayload} payload -
   */
  @OnEvent(events.bankRules.onCreated)
  async recognizedTransactionsOnRuleCreated({
    bankRule,
  }: IBankRuleEventCreatedPayload) {
    const tenantPayload = await this.tenancyContect.getTenantJobPayload();
    const payload = {
      ruleId: bankRule.id,
      ...tenantPayload,
    } as RecognizeUncategorizedTransactionsJobPayload;

    await this.recognizeTransactionsQueue.add(
      RecognizeUncategorizedTransactionsJob,
      payload,
    );
  }

  /**
   * Triggers the recognize uncategorized transactions job on rule edited.
   * @param {IBankRuleEventEditedPayload} payload -
   */
  @OnEvent(events.bankRules.onEdited)
  async recognizedTransactionsOnRuleEdited({
    editRuleDTO,
    oldBankRule,
    bankRule,
  }: IBankRuleEventEditedPayload) {
    // Cannot continue if the new and old bank rule values are the same,
    // after excluding `createdAt` and `updatedAt` dates.
    if (
      isEqual(
        omit(bankRule, ['createdAt', 'updatedAt']),
        omit(oldBankRule, ['createdAt', 'updatedAt']),
      )
    ) {
      return;
    }
    const tenantPayload = await this.tenancyContect.getTenantJobPayload();
    const payload = {
      ruleId: bankRule.id,
      shouldRevert: true,
      ...tenantPayload,
    } as RecognizeUncategorizedTransactionsJobPayload;

    // Re-recognize the transactions based on the new rules.
    // Setting shouldRevert to true ensures that transactions previously recognized
    // by this or lower-priority rules are re-evaluated against the updated rule.
    await this.recognizeTransactionsQueue.add(
      RecognizeUncategorizedTransactionsJob,
      payload,
    );
  }

  /**
   * Triggers the recognize uncategorized transactions job on rule deleted.
   * @param {IBankRuleEventDeletedPayload} payload -
   */
  @OnEvent(events.bankRules.onDeleted)
  async recognizedTransactionsOnRuleDeleted({
    ruleId,
  }: IBankRuleEventDeletedPayload) {
    const tenantPayload = await this.tenancyContect.getTenantJobPayload();
    const payload = {
      ruleId,
      ...tenantPayload,
    } as RecognizeUncategorizedTransactionsJobPayload;

    // Re-recognize the transactions based on the new rules.
    await this.recognizeTransactionsQueue.add(
      RecognizeUncategorizedTransactionsJob,
      payload,
    );
  }

  /**
   * Triggers the recognize bank transactions once the imported file commit.
   * @param {IImportFileCommitedEventPayload} payload -
   */
  @OnEvent(events.cashflow.onTransactionUncategorizedCreated)
  async applyRulesOnUncategorizedCreated({
    uncategorizedTransaction,
    trx,
  }: IUncategorizedTransactionCreatedEventPayload) {
    const tenantPayload = await this.tenancyContect.getTenantJobPayload();
    const accountId = Number((uncategorizedTransaction as any).accountId);

    // Только после фиксации импорта: задача, начатая раньше, не увидела бы
    // строк, которые ещё не сохранены, — и они остались бы неразнесёнными.
    runAfterTransaction(trx, async () => {
      // Сбой очереди не должен ронять сервер: приём «после фиксации»
      // выбрасывает ошибку в пустоту. Импорт уже сохранён — строки просто
      // подождут ручной разноски.
      try {
        await this.recognizeTransactionsQueue.add(
          RecognizeUncategorizedTransactionsJob,
          {
            ...tenantPayload,
            transactionsCriteria: { accountId },
            // Новые строки выписки — разносить сразу (FT-030 ТЗ-3).
            apply: true,
          } as RecognizeUncategorizedTransactionsJobPayload,
          {
            jobId: applyRulesJobId(
              String(tenantPayload.organizationId),
              accountId,
              Date.now(),
            ),
            // Небольшая пауза: пока идёт импорт, сигналы продолжают приходить.
            delay: 3000,
          },
        );
      } catch (error) {
        console.error(
          '[bank-rules] не удалось поставить разноску новых строк',
          error,
        );
      }
    });
  }

  /**
   * Импорт через общий механизм файлов больше не нужен здесь: новые строки
   * любого импорта ловит обработчик выше.
   */
  @OnEvent(events.import.onImportCommitted)
  async triggerRecognizeTransactionsOnImportCommitted({
    importId,

    // @ts-ignore
  }: IImportFileCommitedEventPayload) {
    // const importFile = await Import.query().findOne({ importId });
    // const batch = importFile.paramsParsed.batch;
    // const payload = { transactionsCriteria: { batch } };
    // // Cannot continue if the imported resource is not bank account transactions.
    // if (importFile.resource !== 'UncategorizedCashflowTransaction') return;
    // await this.agenda.now('recognize-uncategorized-transactions-job', payload);
  }
}
