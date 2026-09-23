// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';

import { Account } from '@/modules/Accounts/models/Account.model';
import { Contact } from '@/modules/Contacts/models/Contact';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { Project } from '@/modules/Projects/models/Project.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { BankRule } from '../models/BankRule';
import { TransactionRuleApplication } from '../models/TransactionRuleApplication';

const parse = (raw: string | null): Record<string, any> => {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const ids = (values: unknown[]) =>
  [...new Set(values.map(Number).filter((v) => Number.isFinite(v) && v > 0))];

/**
 * История применений автоправил к денежной операции (FT-036 ТЗ-3): каждое
 * применение — отдельная запись с изменёнными полями, словами, а не
 * номерами. Правило удалили — запись остаётся, имя берётся из самого следа.
 */
@Injectable()
export class GetTransactionRuleApplicationsService {
  constructor(
    @Inject(TransactionRuleApplication.name)
    private readonly applicationModel: TenantModelProxy<typeof TransactionRuleApplication>,

    @Inject(BankRule.name)
    private readonly bankRuleModel: TenantModelProxy<typeof BankRule>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(Project.name)
    private readonly projectModel: TenantModelProxy<typeof Project>,

    @Inject(Contact.name)
    private readonly contactModel: TenantModelProxy<typeof Contact>,

    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,
  ) {}

  private async names(model: () => any, list: number[], field = 'name') {
    if (list.length === 0) return new Map<number, string>();
    const rows: any[] = await model().query().whereIn('id', list);
    return new Map<number, string>(rows.map((row) => [row.id, row[field] ?? row.name]));
  }

  public async byTransaction(transactionId: number) {
    const rows: any[] = await this.applicationModel()
      .query()
      .where('transactionId', transactionId)
      .orderBy('appliedAt', 'desc')
      .orderBy('id', 'desc');
    const changes = rows.map((row) => parse(row.changes));

    const rules = await this.names(() => this.bankRuleModel(), ids(rows.map((r) => r.ruleId)));
    const accounts = await this.names(
      () => this.accountModel(),
      ids(changes.map((c) => c.creditAccountId)),
    );
    const projects = await this.names(
      () => this.projectModel(),
      ids(changes.flatMap((c) => [c.projectId, c.dealId, ...(c.splits ?? []).map((s) => s.projectId)])),
    );
    const contacts = await this.names(
      () => this.contactModel(),
      ids(changes.map((c) => c.contactId)),
      'displayName',
    );
    const articles = await this.names(
      () => this.articleModel(),
      ids(changes.flatMap((c) => (c.splits ?? []).map((s) => s.articleId))),
    );

    return rows.map((row, index) => {
      const c = changes[index];
      return {
        id: row.id,
        ruleId: row.ruleId,
        // Правило удалили — имя из следа, чтобы история не стала безымянной.
        ruleName: rules.get(Number(row.ruleId)) ?? c.ruleName ?? null,
        ruleExists: rules.has(Number(row.ruleId)),
        ruleType: c.ruleType ?? 'assign',
        appliedAt: row.appliedAt,
        account: c.creditAccountId ? accounts.get(Number(c.creditAccountId)) ?? null : null,
        project: c.projectId ? projects.get(Number(c.projectId)) ?? null : null,
        contact: c.contactId ? contacts.get(Number(c.contactId)) ?? null : null,
        splits: (c.splits ?? []).map((s) => ({
          amount: s.amount,
          article: articles.get(Number(s.articleId)) ?? null,
          project: s.projectId ? projects.get(Number(s.projectId)) ?? null : null,
        })),
      };
    });
  }
}
