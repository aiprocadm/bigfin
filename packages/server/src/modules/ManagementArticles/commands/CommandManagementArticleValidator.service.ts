import { Inject, Injectable } from '@nestjs/common';
import { Account } from '@/modules/Accounts/models/Account.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '../models/ManagementArticle.model';
import { ManagementArticleAccount } from '../models/ManagementArticleAccount.model';
import { BALANCE_ARTICLE_KINDS, ERRORS } from '../constants';

@Injectable()
export class CommandManagementArticleValidatorService {
  constructor(
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<
      typeof ManagementArticleAccount
    >,
  ) {}

  /**
   * Validates the article name is unique (optionally excluding one id).
   */
  public async validateNameUniqueness(name: string, notArticleId?: number) {
    const found = await this.articleModel()
      .query()
      .findOne('name', name)
      .onBuild((query) => {
        if (notArticleId) {
          query.whereNot('id', notArticleId);
        }
      });

    if (found) {
      throw new ServiceError(ERRORS.ARTICLE_NAME_EXISTS);
    }
  }

  /**
   * Validates the parent article exists (when parentId is given).
   */
  public async validateParentExists(parentId?: number) {
    if (!parentId) return;

    const parent = await this.articleModel().query().findById(parentId);
    if (!parent) {
      throw new ServiceError(ERRORS.PARENT_ARTICLE_NOT_FOUND);
    }
  }

  /**
   * Validates that setting `parentId` on `articleId` does not create a cycle
   * (including the self-parent case). Walks the ancestor chain upward.
   */
  public async validateNoParentCycle(articleId: number, parentId?: number) {
    if (!parentId) return;

    if (parentId === articleId) {
      throw new ServiceError(ERRORS.ARTICLE_PARENT_CYCLE);
    }

    const visited = new Set<number>();
    let currentId: number | null = parentId;

    while (currentId != null) {
      if (currentId === articleId) {
        throw new ServiceError(ERRORS.ARTICLE_PARENT_CYCLE);
      }
      if (visited.has(currentId)) break; // guard against pre-existing cycles
      visited.add(currentId);

      const node = await this.articleModel().query().findById(currentId);
      currentId = node ? node.parentId : null;
    }
  }

  /**
   * Validates that a child article shares its parent's kind. Root articles
   * (no parent) may be of any kind. Keeps every subtree single-kind, so the
   * P&L rollup never folds income into an expense subtotal (or vice versa).
   */
  public async validateKindMatchesParent(kind: string, parentId?: number) {
    if (!parentId) return;

    const parent = await this.articleModel().query().findById(parentId);
    if (parent && parent.kind !== kind) {
      throw new ServiceError(ERRORS.ARTICLE_KIND_PARENT_MISMATCH);
    }
  }

  /**
   * Пометка «постоянный / переменный» осмысленна только у расходных статей:
   * у выручки постоянных и переменных не бывает.
   *
   * Проверка стоит на сервере, а не только в форме: через ручку API статью
   * заводят и импортом, и интеграцией. Бессмыслица, доехавшая до базы, потом
   * тихо попадёт в расчёт точки безубыточности.
   */
  public validateCostBehaviorMatchesKind(
    kind: string,
    costBehavior?: string | null,
  ) {
    if (!costBehavior) return;
    if (kind !== 'expense') {
      throw new ServiceError(ERRORS.COST_BEHAVIOR_ONLY_FOR_EXPENSE);
    }
  }

  /**
   * У балансовой статьи раздел движения денег ОБЯЗАТЕЛЕН.
   *
   * ЗАЧЕМ. Балансовых статей нет в отчёте о прибыли — их единственное место
   * в отчётности это ДДС, а там строка встаёт по разделу: операционный,
   * инвестиционный или финансовый. Статья без раздела не попадёт никуда: она
   * будет видна в справочнике, ею можно будет разметить платёж, и сумма
   * тихо исчезнет из всех отчётов сразу.
   *
   * У доходов и расходов раздел остаётся необязательным — у них есть ОПиУ,
   * и требовать его задним числом значило бы сломать существующие статьи.
   */
  public validateCashflowSectionPresence(
    kind: string,
    cashflowSection?: string | null,
  ) {
    const isBalanceKind = (BALANCE_ARTICLE_KINDS as readonly string[]).includes(
      kind,
    );

    if (isBalanceKind && !cashflowSection) {
      throw new ServiceError(ERRORS.CASHFLOW_SECTION_REQUIRED);
    }
  }

  /**
   * Validates that every direct child of `articleId` shares `kind`. Used on
   * edit to block changing an article's kind while it still has children of
   * the previous kind, which would break the single-kind subtree invariant.
   */
  public async validateChildrenMatchKind(articleId: number, kind: string) {
    const mismatched = await this.articleModel()
      .query()
      .where('parentId', articleId)
      .whereNot('kind', kind)
      .resultSize();

    if (mismatched > 0) {
      throw new ServiceError(ERRORS.ARTICLE_KIND_CHILDREN_MISMATCH);
    }
  }

  /**
   * Validates all given account ids exist.
   */
  public async validateAccountsExist(accountIds?: number[]) {
    if (!accountIds || accountIds.length === 0) return;

    const count = await this.accountModel()
      .query()
      .whereIn('id', accountIds)
      .resultSize();

    if (count !== accountIds.length) {
      throw new ServiceError(ERRORS.ACCOUNT_NOT_FOUND);
    }
  }

  /**
   * Validates that every mapped account is on the same side as the article kind:
   * an income article may only map income accounts, an expense article only
   * expense accounts (the account root type must equal the article kind).
   */
  public async validateAccountsMatchKind(kind: string, accountIds?: number[]) {
    if (!accountIds || accountIds.length === 0) return;

    const accounts = await this.accountModel()
      .query()
      .whereIn('id', accountIds);

    const hasMismatch = accounts.some(
      (account) => account.accountRootType !== kind,
    );
    if (hasMismatch) {
      throw new ServiceError(ERRORS.ACCOUNT_KIND_MISMATCH);
    }
  }

  /**
   * Validates none of the given accounts is already mapped to another article.
   * Enforces the v1 rule: one account belongs to exactly one article.
   */
  public async validateAccountsNotMapped(
    accountIds?: number[],
    ownArticleId?: number,
  ) {
    if (!accountIds || accountIds.length === 0) return;

    const conflicting = await this.articleAccountModel()
      .query()
      .whereIn('accountId', accountIds)
      .onBuild((query) => {
        if (ownArticleId) {
          query.whereNot('articleId', ownArticleId);
        }
      });

    if (conflicting.length > 0) {
      throw new ServiceError(ERRORS.ACCOUNT_ALREADY_MAPPED);
    }
  }
}
