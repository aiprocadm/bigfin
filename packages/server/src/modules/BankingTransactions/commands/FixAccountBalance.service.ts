// © 2026 Bigfin
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { CASHFLOW_TRANSACTION_TYPE } from '../constants';
import { CreateBankTransactionDto } from '../dtos/CreateBankTransaction.dto';
import { FixAccountBalanceDto } from '../dtos/FixAccountBalance.dto';
import { CreateBankTransactionService } from './CreateBankTransaction.service';

/**
 * Фиксация остатка на дату (FT-071 ТЗ-3).
 *
 * ЗАЧЕМ. Человек смотрит в банк: «на конец 23 сентября — 125 000». В Bigfin
 * по счёту выходит 124 300: где-то потерялась комиссия, где-то операция
 * заведена дважды. Искать разницу по строкам он будет потом (для этого есть
 * сверка), а остаток нужен верный сейчас — от него считаются кассовый
 * разрыв, прогноз и главная.
 *
 * КАК. Остаток счёта на конец дня считается по проводкам — тем же, из
 * которых его показывает продукт. На разницу создаётся ОБЫЧНАЯ денежная
 * операция тем же путём, что и из формы (`CreateBankTransactionService`):
 * проводки, журнал изменений, запрет закрытого периода и вебхуки работают
 * так же, как у любой операции, и корректировку видно в истории счёта.
 *
 * КУДА. На служебный счёт капитала «Корректировка остатка», размеченный
 * служебной статьёй с разделом «Корректировки остатка». Капитал — потому
 * что расхождение с банком не доход и не расход: иначе фиксация остатка
 * меняла бы прибыль и оценку налога. Отдельный раздел — потому что это и не
 * деятельность бизнеса: операционный поток не должен вбирать ошибки учёта.
 */

/** Служебный счёт учёта — ищется по slug, заводится при первой фиксации. */
export const BALANCE_ADJUSTMENT_ACCOUNT = {
  name: 'Корректировка остатка',
  slug: 'balance-adjustment',
  accountType: 'equity',
  description:
    'Разница между остатком по выписке банка и остатком в учёте на дату фиксации',
  active: true,
  index: 1,
  predefined: true,
};

/**
 * Служебная статья. Ищется по устойчивому ключу `seed_key`, а не по имени:
 * имя системной статьи человек вправе поменять, и поиск по имени завёл бы
 * вторую такую же статью.
 */
export const BALANCE_ADJUSTMENT_ARTICLE = {
  name: 'Корректировка остатка',
  kind: 'equity',
  cashflowSection: 'adjustments',
  seedKey: 'balance_adjustment',
  sortOrder: 90,
  active: true,
};

export const FIX_BALANCE_ERRORS = {
  ACCOUNT_NOT_FOUND: 'FIX_BALANCE_ACCOUNT_NOT_FOUND',
  NOT_MONEY_ACCOUNT: 'FIX_BALANCE_NOT_MONEY_ACCOUNT',
  INVALID_DATE: 'FIX_BALANCE_INVALID_DATE',
};

/**
 * Счета, остаток которых фиксируется: касса и банк. У кредитной карты
 * остаток — долг, и «приход» на неё уменьшает его, а не увеличивает; для неё
 * правило знака было бы другим, а спроса на это нет.
 */
const MONEY_ACCOUNT_TYPES = ['cash', 'bank'];

const round2 = (value: number): number => Math.round(value * 100) / 100;

export interface BalanceCorrection {
  /** Разница «по выписке минус в учёте»: плюс — денег больше, чем в учёте. */
  difference: number;
  /** Приход на счёт или списание со счёта. */
  transactionType: CASHFLOW_TRANSACTION_TYPE;
  /** Сумма операции — всегда положительная. */
  amount: number;
}

/**
 * Какую операцию создать, чтобы остаток стал равен заданному.
 *
 * `null` — разницы нет (меньше копейки): операция-пустышка на ноль рублей
 * только засоряла бы историю счёта.
 *
 * Типы операций — взнос и изъятие собственника: это ровно те денежные
 * операции, у которых вторая сторона — счёт капитала. Смысл операции видно
 * по счёту и статье «Корректировка остатка» и по описанию.
 */
export function computeBalanceCorrection(
  currentBalance: number,
  targetBalance: number,
): BalanceCorrection | null {
  const difference = round2(Number(targetBalance) - Number(currentBalance));
  if (Math.abs(difference) < 0.005) return null;

  return {
    difference,
    transactionType:
      difference > 0
        ? CASHFLOW_TRANSACTION_TYPE.OWNER_CONTRIBUTION
        : CASHFLOW_TRANSACTION_TYPE.OWNERS_DRAWING,
    amount: Math.abs(difference),
  };
}

export interface FixAccountBalanceResult {
  /** Создана ли корректирующая операция. `false` — остаток уже верный. */
  created: boolean;
  accountId: number;
  date: string;
  /** Остаток в учёте на конец дня ДО фиксации. */
  previousBalance: number;
  /** Зафиксированный остаток. */
  targetBalance: number;
  /** Сумма корректировки со знаком; 0 — корректировать было нечего. */
  difference: number;
  transactionId: number | null;
}

@Injectable()
export class FixAccountBalanceService {
  constructor(
    private readonly createTransactionService: CreateBankTransactionService,
    private readonly tenancyContext: TenancyContext,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(AccountTransaction.name)
    private readonly ledgerModel: TenantModelProxy<typeof AccountTransaction>,

    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<
      typeof ManagementArticleAccount
    >,
  ) {}

  /**
   * Остаток счёта на конец дня — по проводкам, в валюте счёта.
   * Удалённые в корзину операции проводок не имеют и в остаток не входят.
   */
  public async balanceAt(accountId: number, date: string): Promise<number> {
    const row: any = await this.ledgerModel()
      .query()
      .where('accountId', accountId)
      .modify('closingBalance', date)
      .first();

    return round2(Number(row?.debit ?? 0) - Number(row?.credit ?? 0));
  }

  public async fixBalance(
    dto: FixAccountBalanceDto,
  ): Promise<FixAccountBalanceResult> {
    const account: any = await this.accountModel()
      .query()
      .findById(dto.accountId);

    if (!account) {
      throw new ServiceError(
        FIX_BALANCE_ERRORS.ACCOUNT_NOT_FOUND,
        'Счёт не найден',
        null,
        HttpStatus.NOT_FOUND,
      );
    }
    if (!MONEY_ACCOUNT_TYPES.includes(account.accountType)) {
      throw new ServiceError(
        FIX_BALANCE_ERRORS.NOT_MONEY_ACCOUNT,
        'Остаток фиксируется только у кассы и банковского счёта',
        null,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const day = moment(dto.date, 'YYYY-MM-DD', true);
    if (!day.isValid()) {
      throw new ServiceError(
        FIX_BALANCE_ERRORS.INVALID_DATE,
        'Дата указана неверно',
        null,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const date = day.format('YYYY-MM-DD');
    const targetBalance = round2(Number(dto.amount));
    const previousBalance = await this.balanceAt(account.id, date);
    const correction = computeBalanceCorrection(previousBalance, targetBalance);

    const result: FixAccountBalanceResult = {
      created: false,
      accountId: Number(account.id),
      date,
      previousBalance,
      targetBalance,
      difference: 0,
      transactionId: null,
    };
    if (!correction) return result;

    // Счёт и статья заводятся ДО операции и отдельно от неё: служба создания
    // операции читает счета вне нашей транзакции и незакоммиченный счёт не
    // увидела бы. Обе находки идемпотентны — повторная фиксация ничего не
    // заводит второй раз.
    const adjustmentAccount = await this.findOrCreateAdjustmentAccount();
    await this.findOrCreateAdjustmentArticle(adjustmentAccount.id);

    const transaction: any =
      await this.createTransactionService.newCashflowTransaction({
        date: date as any,
        transactionType: correction.transactionType,
        amount: correction.amount,
        creditAccountId: adjustmentAccount.id,
        cashflowAccountId: account.id,
        description: `Корректировка остатка: на конец дня ${day.format('DD.MM.YYYY')} зафиксирован остаток ${targetBalance}`,
        exchangeRate: dto.exchangeRate ?? 1,
        publish: true,
      } as CreateBankTransactionDto);

    return {
      ...result,
      created: true,
      difference: correction.difference,
      transactionId: Number(transaction?.id) || null,
    };
  }

  /** Служебный счёт капитала — find-or-create по slug. */
  private async findOrCreateAdjustmentAccount(): Promise<any> {
    const existing = await this.accountModel()
      .query()
      .findOne({ slug: BALANCE_ADJUSTMENT_ACCOUNT.slug });
    if (existing) return existing;

    // Капитал ведётся в базовой валюте — как и у счетов капитала из сида.
    const metadata: any = await this.tenancyContext.getTenantMetadata();

    return this.accountModel()
      .query()
      .insertAndFetch({
        ...BALANCE_ADJUSTMENT_ACCOUNT,
        currencyCode: metadata?.baseCurrency,
      } as any);
  }

  /**
   * Служебная статья — find-or-create по ключу, плюс привязка счёта.
   *
   * Если человек уже привязал служебный счёт к другой статье, привязку не
   * трогаем: счёт входит ровно в одну статью, и его выбор главнее.
   */
  private async findOrCreateAdjustmentArticle(accountId: number) {
    let article: any = await this.articleModel()
      .query()
      .findOne({ seedKey: BALANCE_ADJUSTMENT_ARTICLE.seedKey });

    if (!article) {
      article = await this.articleModel()
        .query()
        .insertAndFetch({ ...BALANCE_ADJUSTMENT_ARTICLE, parentId: null } as any);
    }
    const mapping = await this.articleAccountModel()
      .query()
      .findOne({ accountId });

    if (!mapping) {
      await this.articleAccountModel()
        .query()
        .insert({ articleId: article.id, accountId } as any);
    }
    return article;
  }
}
