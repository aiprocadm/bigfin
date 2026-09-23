// © 2026 Bigfin
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as moment from 'moment';

import { BankRule } from '@/modules/BankRules/models/BankRule';
import { ruleMatches } from '@/modules/BankRules/utils/matchRule';
import { UncategorizedBankTransaction } from '@/modules/BankingTransactions/models/UncategorizedBankTransaction';
import { ServiceError } from '@/modules/Items/ServiceError';
import { Notification } from '@/modules/Notifications/models/Notification.model';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { RecognizedBankTransaction } from '../models/RecognizedBankTransaction';
import {
  ApplyBankRuleToPastJob,
  ApplyBankRuleToPastJobPayload,
  RecognizeUncategorizedTransactionsQueue,
} from '../_types';
import { ApplyBankRuleService, RuleApplyOutcome } from './ApplyBankRule.service';

/** Сколько строк предпросмотр отдаёт целиком; дальше — только счёт. */
export const PREVIEW_ITEMS_LIMIT = 500;

export const APPLY_TO_PAST_ERRORS = {
  NOTHING_SELECTED: 'BANK_RULE_APPLY_NOTHING_SELECTED',
};

/**
 * «Применить к прошлым операциям» (FT-034 ТЗ-3).
 *
 * Молча разносить то, что уже лежит, правило не вправе: человек мог
 * разобрать часть строк иначе. Поэтому три шага — предпросмотр ровно тех
 * строк, что подходят (тем же движком, что при импорте), выбор галочками и
 * фоновая задача. 10 000 строк не держат экран: задача идёт в очереди, а
 * итог приходит уведомлением.
 */
@Injectable()
export class ApplyRuleToPastService {
  constructor(
    private readonly applyBankRule: ApplyBankRuleService,
    private readonly tenancyContext: TenancyContext,

    @InjectQueue(RecognizeUncategorizedTransactionsQueue)
    private readonly queue: Queue,

    @Inject(BankRule.name)
    private readonly bankRuleModel: TenantModelProxy<typeof BankRule>,

    @Inject(UncategorizedBankTransaction.name)
    private readonly uncategorizedModel: TenantModelProxy<typeof UncategorizedBankTransaction>,

    @Inject(RecognizedBankTransaction.name)
    private readonly recognizedModel: TenantModelProxy<typeof RecognizedBankTransaction>,

    @Inject(Notification.name)
    private readonly notificationModel: TenantModelProxy<typeof Notification>,
  ) {}

  private async rule(ruleId: number): Promise<any> {
    return this.bankRuleModel()
      .query()
      .findById(ruleId)
      .withGraphFetched('conditions')
      .withGraphFetched('splits')
      .throwIfNotFound();
  }

  /** Неразнесённые строки, которые подходят под правило, — свежие сверху. */
  private async matchingRows(rule: any): Promise<any[]> {
    const rows: any[] = await this.uncategorizedModel()
      .query()
      .modify('notCategorized')
      // Исключённые человеком строки правило не трогает.
      .modify('notExcluded')
      // Удалённое в корзину правило не трогает (FT-042 ТЗ-3).
      .modify('notDeleted')
      .onBuild((q) => {
        if (rule.applyIfAccountId) q.where('accountId', rule.applyIfAccountId);
      })
      .orderBy('date', 'desc')
      .orderBy('id', 'desc');
    return rows.filter((row) => ruleMatches(rule, row));
  }

  public async preview(ruleId: number) {
    const rule = await this.rule(ruleId);
    const rows = await this.matchingRows(rule);
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      total: rows.length,
      // Все номера — чтобы «применить всё» не требовало второго запроса;
      // подробности — только первых строк, иначе ответ на 10 000 строк
      // весил бы мегабайты.
      ids: rows.map((row) => row.id),
      items: rows.slice(0, PREVIEW_ITEMS_LIMIT).map((row) => ({
        id: row.id,
        date: row.date,
        amount: row.amount,
        currencyCode: row.currencyCode,
        description: row.description,
        payee: row.payee,
        accountId: row.accountId,
        recognizedByOtherRule: Boolean(row.recognizedTransactionId),
      })),
    };
  }

  /** Ставит задачу; строки выбирает человек. */
  public async queueApply(ruleId: number, ids: number[]) {
    const unique = [...new Set((ids ?? []).map(Number).filter((id) => id > 0))];
    if (unique.length === 0) {
      throw new ServiceError(
        APPLY_TO_PAST_ERRORS.NOTHING_SELECTED,
        'Не выбрано ни одной операции',
        null,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    await this.rule(ruleId);
    const tenantPayload = await this.tenancyContext.getTenantJobPayload();
    const job = await this.queue.add(ApplyBankRuleToPastJob, {
      ...tenantPayload,
      ruleId,
      ids: unique,
    } as ApplyBankRuleToPastJobPayload);
    return { queued: unique.length, jobId: job.id };
  }

  /**
   * Исполняет задачу. Каждая строка перепроверяется: за время ожидания её
   * могли разнести руками или поправить описание — такую правило не трогает.
   */
  public async run(ruleId: number, ids: number[]): Promise<RuleApplyOutcome[]> {
    const rule = await this.rule(ruleId);
    const outcomes: RuleApplyOutcome[] = [];

    for (const id of ids) {
      const row: any = await this.uncategorizedModel().query().findById(id);
      if (!row) {
        outcomes.push({ uncategorizedTransactionId: id, status: 'skipped', reason: 'not_found' });
        continue;
      }
      if (row.categorized) {
        outcomes.push({ uncategorizedTransactionId: id, status: 'skipped', reason: 'already_categorized' });
        continue;
      }
      if (row.isExcluded || row.deletedAt || !ruleMatches(rule, row)) {
        outcomes.push({ uncategorizedTransactionId: id, status: 'skipped', reason: 'no_longer_matches' });
        continue;
      }
      // Сбой одной строки не роняет пакет: остальные разносятся, итог
      // приходит уведомлением. Раньше первая же ошибка обрывала задачу —
      // строки после неё молча оставались неразнесёнными.
      try {
        await this.markRecognizedBy(rule, row);
        outcomes.push(await this.applyBankRule.apply(rule, row));
      } catch (error) {
        outcomes.push({
          uncategorizedTransactionId: id,
          status: 'skipped',
          reason: (error as any)?.errorType ?? (error as any)?.message ?? 'apply_failed',
        });
      }
    }
    await this.notify(rule, outcomes);
    return outcomes;
  }

  /**
   * Строку разнесло ЭТО правило — так и записываем, даже если раньше её
   * узнало другое: в карточке операции видно, какое правило поставило
   * статью.
   */
  private async markRecognizedBy(rule: any, row: any) {
    const previousRecognitionId = row.recognizedTransactionId;
    if (previousRecognitionId) {
      // СНАЧАЛА отвязать строку, ПОТОМ удалить старую отметку: на отметку
      // смотрит внешний ключ строки, и обратный порядок база отвергает.
      // Так и падала задача на живом стенде, когда строку заранее узнало
      // другое правило.
      await this.uncategorizedModel()
        .query()
        .findById(row.id)
        .patch({ recognizedTransactionId: null } as any);
      await this.recognizedModel().query().deleteById(previousRecognitionId);
    }
    const recognized: any = await this.recognizedModel()
      .query()
      .insert({
        bankRuleId: rule.id,
        uncategorizedTransactionId: row.id,
        assignedCategory: rule.assignCategory,
        assignedAccountId: rule.assignAccountId ?? rule.transferToAccountId ?? null,
        assignedPayee: rule.assignPayee,
        assignedMemo: rule.assignMemo,
      } as any);
    await this.uncategorizedModel()
      .query()
      .findById(row.id)
      .patch({ recognizedTransactionId: recognized.id } as any);
  }

  /** «Правило применено к N операциям» (FT-034) — в ленту уведомлений. */
  private async notify(rule: any, outcomes: RuleApplyOutcome[]) {
    const applied = outcomes.filter((o) => o.status === 'applied').length;
    const skipped = outcomes.length - applied;
    try {
      await this.notificationModel()
        .query()
        .insert({
          eventType: 'bank_rule_applied',
          // Запасной текст — лента переводит по eventType.
          title: 'Автоправило применено',
          body: `Правило «${rule.name}» разнесло операций: ${applied}. Пропущено: ${skipped}.`,
          dedupKey: `bank_rule_applied:${rule.id}:${Date.now()}`,
          payload: JSON.stringify({ ruleId: rule.id, ruleName: rule.name, applied, skipped }),
          // Формат базы напрямую: расширение moment подключается при запуске
          // сервера, и без него уведомление молча не записалось бы.
          firedAt: moment().format('YYYY-MM-DD HH:mm:ss'),
          channelsSent: JSON.stringify([]),
        } as any);
    } catch (error) {
      // Уведомление — не повод объявлять разноску неудачной: она уже прошла.
      console.error('[bank-rules] не удалось записать уведомление', error);
    }
  }
}
