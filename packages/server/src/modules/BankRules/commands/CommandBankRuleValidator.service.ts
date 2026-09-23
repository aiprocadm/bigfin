// © 2026 Bigfin
import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { ACCOUNT_TYPE } from '@/constants/accounts';
import { Account } from '@/modules/Accounts/models/Account.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CommandBankRuleDto } from '../dtos/BankRule.dto';
import { validateShares } from '../utils/splitShares';

export const BANK_RULE_ERRORS = {
  /** Перевод между счетами разной валюты (FT-032, 422 по ТЗ). */
  TRANSFER_RULE_CURRENCY_MISMATCH: 'TRANSFER_RULE_CURRENCY_MISMATCH',
  TRANSFER_RULE_SOURCE_REQUIRED: 'TRANSFER_RULE_SOURCE_REQUIRED',
  TRANSFER_RULE_SAME_ACCOUNT: 'TRANSFER_RULE_SAME_ACCOUNT',
  TRANSFER_RULE_TARGET_NOT_CASH: 'TRANSFER_RULE_TARGET_NOT_CASH',
  SPLIT_SHARES_NOT_100: 'BANK_RULE_SPLIT_SHARES_NOT_100',
  SPLIT_ARTICLE_WITHOUT_ACCOUNT: 'BANK_RULE_SPLIT_ARTICLE_WITHOUT_ACCOUNT',
};

/** Счета, между которыми бывает перевод: касса, банк, карта. */
const CASH_ACCOUNT_TYPES = [ACCOUNT_TYPE.CASH, ACCOUNT_TYPE.BANK, ACCOUNT_TYPE.CREDIT_CARD];

/**
 * Проверки правила, которые нельзя выразить в описании запроса: им нужна
 * база (валюта счетов, счёт у статьи) или сумма по нескольким строкам.
 */
@Injectable()
export class CommandBankRuleValidatorService {
  constructor(
    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<typeof ManagementArticleAccount>,
  ) {}

  public async validate(dto: CommandBankRuleDto): Promise<void> {
    const ruleType = dto.ruleType ?? 'assign';
    if (ruleType === 'split') await this.validateSplit(dto);
    if (ruleType === 'transfer') await this.validateTransfer(dto);
  }

  /** Доли — ровно 100 %, и у каждой статьи есть счёт для проводки. */
  private async validateSplit(dto: CommandBankRuleDto) {
    const lines = (dto as any).splits ?? [];
    const shares = validateShares(lines.map((line) => Number(line.sharePercent)));
    if (!shares.isValid) {
      throw new ServiceError(
        BANK_RULE_ERRORS.SPLIT_SHARES_NOT_100,
        'Доли разбиения в сумме должны давать 100 %',
        { total: shares.total, problem: shares.problem },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const articleIds: number[] = [...new Set<number>(lines.map((line) => Number(line.articleId)))];
    const mapped: any[] = await this.articleAccountModel()
      .query()
      .whereIn('articleId', articleIds);
    const withAccount = new Set(mapped.map((row) => Number(row.articleId)));
    const missing = articleIds.filter((id) => !withAccount.has(id));
    if (missing.length > 0) {
      throw new ServiceError(
        BANK_RULE_ERRORS.SPLIT_ARTICLE_WITHOUT_ACCOUNT,
        'У статьи нет счёта: долю не на что провести',
        { articleIds: missing },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  /**
   * Перевод: откуда, куда, и одна валюта. Разные валюты — отказ с именем
   * ошибки из ТЗ: перевод «рубли → доллары» без курса дал бы в отчёте
   * деньги из ниоткуда.
   */
  private async validateTransfer(dto: CommandBankRuleDto) {
    if (!dto.applyIfAccountId) {
      throw new ServiceError(
        BANK_RULE_ERRORS.TRANSFER_RULE_SOURCE_REQUIRED,
        'У правила перевода должен быть счёт-источник',
        null,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (Number(dto.applyIfAccountId) === Number(dto.transferToAccountId)) {
      throw new ServiceError(
        BANK_RULE_ERRORS.TRANSFER_RULE_SAME_ACCOUNT,
        'Счёт-источник и счёт-получатель совпадают',
        null,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const accounts: any[] = await this.accountModel()
      .query()
      .whereIn('id', [dto.applyIfAccountId, dto.transferToAccountId]);
    const source = accounts.find((a) => a.id === Number(dto.applyIfAccountId));
    const target = accounts.find((a) => a.id === Number(dto.transferToAccountId));
    if (!target || !CASH_ACCOUNT_TYPES.includes(target.accountType)) {
      throw new ServiceError(
        BANK_RULE_ERRORS.TRANSFER_RULE_TARGET_NOT_CASH,
        'Перевести можно только на кассу, банковский счёт или карту',
        null,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (source && source.currencyCode !== target.currencyCode) {
      throw new ServiceError(
        BANK_RULE_ERRORS.TRANSFER_RULE_CURRENCY_MISMATCH,
        'Перевод возможен только между счетами одной валюты',
        { from: source.currencyCode, to: target.currencyCode },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }
}
