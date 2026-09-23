// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';

import { CategorizeBankTransaction } from '@/modules/BankingCategorize/commands/CategorizeBankTransaction';
import { BankTransactionGLEntriesService, CASHFLOW_SPLIT_REFERENCE } from '@/modules/BankingTransactions/commands/BankTransactionGLEntries';
import { UncategorizedBankTransaction } from '@/modules/BankingTransactions/models/UncategorizedBankTransaction';
import { planRuleCategorization } from '@/modules/BankRules/utils/ruleCategorization';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TransactionSplitsService } from '@/modules/TransactionSplits/TransactionSplits.service';

export interface RuleApplyOutcome {
  uncategorizedTransactionId: number;
  status: 'applied' | 'skipped';
  /** Почему пропущено — словами для журнала, кодом для экрана. */
  reason?: string;
}

/**
 * Разносит строку выписки по автоправилу (FT-030…FT-032 ТЗ-3).
 *
 * Правило раньше только ПОДСКАЗЫВАЛО: помечало строку «распознано», а
 * разносить её всё равно приходилось руками — после импорта на 300 строк
 * человек кликал 300 раз. Теперь правило разносит само тем же путём, что
 * и человек (`CategorizeBankTransaction`): все проверки разноски действуют и
 * здесь — чужая валюта без курса, неподходящий счёт, исключённая строка.
 *
 * Строка, которую разнести не удалось, НЕ роняет пакет: она остаётся
 * неразнесённой, а причина возвращается наверх — в итог задачи и журнал.
 */
@Injectable()
export class ApplyBankRuleService {
  constructor(
    private readonly categorize: CategorizeBankTransaction,
    private readonly glEntries: BankTransactionGLEntriesService,
    private readonly transactionSplits: TransactionSplitsService,

    @Inject(UncategorizedBankTransaction.name)
    private readonly uncategorizedModel: TenantModelProxy<typeof UncategorizedBankTransaction>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<typeof ManagementArticleAccount>,
  ) {}

  /** Статья → её счёт (первый по номеру, как в проводках частей). */
  private async articleAccounts(rule: any): Promise<Map<number, number>> {
    const ids = (rule.splits ?? []).map((line) => Number(line.articleId));
    const map = new Map<number, number>();
    if (ids.length === 0) return map;
    const links: any[] = await this.articleAccountModel()
      .query()
      .whereIn('articleId', ids)
      .orderBy('accountId', 'asc');
    links.forEach((link) => {
      if (!map.has(link.articleId)) map.set(link.articleId, link.accountId);
    });
    return map;
  }

  public async apply(rule: any, row: UncategorizedBankTransaction): Promise<RuleApplyOutcome> {
    const outcome = (status: RuleApplyOutcome['status'], reason?: string) => ({
      uncategorizedTransactionId: row.id,
      status,
      ...(reason ? { reason } : {}),
    });
    if ((row as any).categorized) return outcome('skipped', 'already_categorized');

    const plan = planRuleCategorization(rule, row, await this.articleAccounts(rule));
    if ('skip' in plan) return outcome('skipped', plan.skip);

    try {
      await this.categorize.categorize(row.id, {
        date: row.date,
        referenceNo: (row as any).referenceNo,
        description: (row as any).description,
        currencyCode: (row as any).currencyCode,
        transactionType: plan.transactionType,
        creditAccountId: plan.creditAccountId,
        contactId: plan.contactId ?? undefined,
        projectId: plan.projectId,
      } as any);
    } catch (error) {
      // Разноска отказала (валюта без курса, счёт не того вида и т. п.) —
      // строка остаётся ждать человека, остальные идут дальше.
      return outcome('skipped', (error as any)?.errorType ?? (error as any)?.message ?? 'categorize_failed');
    }

    if (plan.splits.length > 0) {
      const fresh: any = await this.uncategorizedModel().query().findById(row.id);
      const cashflowId = Number(fresh?.categorizeRefId);
      await this.transactionSplits.saveSplits({
        referenceType: CASHFLOW_SPLIT_REFERENCE,
        referenceId: cashflowId,
        parentAmount: Math.abs(Number(row.amount)),
        lines: plan.splits,
      });
      // Проводки уже написаны на одну статью — пересобираем по частям.
      await this.glEntries.revertJournalEntries(cashflowId);
      await this.glEntries.writeJournalEntries(cashflowId);
    }
    return outcome('applied');
  }
}
