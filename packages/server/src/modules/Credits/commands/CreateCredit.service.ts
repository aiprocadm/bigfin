// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { Account } from '@/modules/Accounts/models/Account.model';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';
import { PlannedOperation } from '@/modules/PaymentCalendar/models/PlannedOperation.model';
import { LedgerStorageService } from '@/modules/Ledger/LedgerStorage.service';
import { Ledger } from '@/modules/Ledger/Ledger';
import { Credit } from '../models/Credit.model';
import { generateSchedule } from '../utils/generateSchedule';
import { getCreditDisbursementGLEntries } from '../utils/creditGLEntries';
import {
  CASH_ACCOUNT_TYPES,
  ERRORS,
  LOAN_INTEREST_ARTICLE,
  LOAN_INTEREST_EXPENSE_ACCOUNT,
  liabilityAccountTypeForTerm,
} from '../constants';
import { CreateCreditDto } from '../dtos/Credit.dto';

/**
 * Регистрирует кредит: создаёт счёт-обязательство, строит график платежей,
 * постит GL-проводку выдачи (Dr банк / Cr обязательство) и планирует операции
 * в платёжном календаре — всё в одной транзакции.
 * Счёт «Проценты по кредитам» и статья ④ создаются лениво (find-or-create).
 */
@Injectable()
export class CreateCreditService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ledgerStorage: LedgerStorageService,
    private readonly tenancyContext: TenancyContext,

    @Inject(Credit.name)
    private readonly creditModel: TenantModelProxy<typeof Credit>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<
      typeof ManagementArticleAccount
    >,

    @Inject(PlannedOperation.name)
    private readonly plannedOperationModel: TenantModelProxy<
      typeof PlannedOperation
    >,
  ) {}

  public async create(dto: CreateCreditDto) {
    if (!(Number(dto.principalAmount) > 0)) {
      throw new ServiceError(ERRORS.INVALID_AMOUNT);
    }
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const currencyCode = metadata?.baseCurrency;

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      // Проверяем счёт выдачи.
      const bank: any = await this.accountModel()
        .query(trx)
        .findById(dto.paymentAccountId);

      if (!bank) throw new ServiceError(ERRORS.PAYMENT_ACCOUNT_NOT_FOUND);
      if (!CASH_ACCOUNT_TYPES.includes(bank.accountType)) {
        throw new ServiceError(ERRORS.PAYMENT_ACCOUNT_NOT_CASH);
      }

      // Find-or-create: счёт расходов по процентам и статья ④.
      const interestAccount = await this.findOrCreateInterestAccount(
        currencyCode,
        trx,
      );
      await this.findOrCreateInterestArticle(interestAccount.id, trx);

      // Создаём счёт-обязательство (краткосрочный ≤12 мес / долгосрочный).
      const liabilityAccount: any = await this.accountModel()
        .query(trx)
        .insertAndFetch({
          name: dto.name,
          accountType: liabilityAccountTypeForTerm(Number(dto.termMonths)),
          currencyCode,
          active: true,
          predefined: false,
        } as any);

      // Строим график платежей.
      const schedule = generateSchedule({
        principal: Number(dto.principalAmount),
        annualRate: Number(dto.annualInterestRate),
        termMonths: Number(dto.termMonths),
        startDate: dto.startDate,
        scheduleType: dto.scheduleType,
      });

      // Сохраняем кредит вместе с рассрочками (insertGraph).
      const credit: any = await this.creditModel()
        .query(trx)
        .insertGraph({
          name: dto.name,
          lender: dto.lender ?? null,
          principalAmount: dto.principalAmount,
          annualInterestRate: dto.annualInterestRate,
          termMonths: dto.termMonths,
          startDate: dto.startDate,
          scheduleType: dto.scheduleType,
          paymentAccountId: dto.paymentAccountId,
          liabilityAccountId: liabilityAccount.id,
          interestExpenseAccountId: interestAccount.id,
          status: 'active',
          note: dto.note ?? null,
          installments: schedule.map((r) => ({
            seqNo: r.seqNo,
            dueDate: r.dueDate,
            paymentAmount: r.paymentAmount,
            principalAmount: r.principalAmount,
            interestAmount: r.interestAmount,
            remainingBalance: r.remainingBalance,
            status: 'planned',
          })),
        } as any);

      // GL-проводка выдачи: Dr банк / Cr обязательство.
      const ledger = new Ledger(
        getCreditDisbursementGLEntries({
          creditId: credit.id,
          date: dto.startDate,
          principal: Number(dto.principalAmount),
          currencyCode,
          bankAccountId: dto.paymentAccountId,
          liabilityAccountId: liabilityAccount.id,
        }),
      );
      await this.ledgerStorage.commit(ledger, trx);

      // Перезагружаем кредит с рассрочками (insertGraph возвращает минимум).
      const fresh: any = await this.creditModel()
        .query(trx)
        .findById(credit.id)
        .withGraphFetched('installments');

      // Планируем операции в платёжном календаре.
      await this.plannedOperationModel()
        .query(trx)
        .insert(
          fresh.installments.map((inst: any) => ({
            direction: 'outflow',
            amount: inst.paymentAmount,
            currencyCode,
            plannedDate: inst.dueDate,
            articleId: null,
            accountId: dto.paymentAccountId,
            status: 'planned',
            sourceType: 'CreditInstallment',
            sourceId: inst.id,
            description: dto.name,
          })) as any,
        );

      return fresh;
    });
  }

  /** Счёт «Проценты по кредитам» — find-or-create по slug. */
  private async findOrCreateInterestAccount(
    currencyCode: string,
    trx: Knex.Transaction,
  ) {
    let account: any = await this.accountModel()
      .query(trx)
      .findOne({ slug: LOAN_INTEREST_EXPENSE_ACCOUNT.slug });

    if (!account) {
      account = await this.accountModel()
        .query(trx)
        .insertAndFetch({
          ...LOAN_INTEREST_EXPENSE_ACCOUNT,
          currencyCode,
        } as any);
    }
    return account;
  }

  /** Статья ④ «Проценты по кредитам» — find-or-create по name+kind; привязка к счёту. */
  private async findOrCreateInterestArticle(
    accountId: number,
    trx: Knex.Transaction,
  ) {
    let article: any = await this.articleModel()
      .query(trx)
      .findOne({ name: LOAN_INTEREST_ARTICLE.name, kind: 'expense' });

    if (!article) {
      article = await this.articleModel()
        .query(trx)
        .insertAndFetch({ ...LOAN_INTEREST_ARTICLE, parentId: null } as any);
    }

    const mapping = await this.articleAccountModel()
      .query(trx)
      .findOne({ articleId: article.id, accountId });

    if (!mapping) {
      await this.articleAccountModel()
        .query(trx)
        .insert({ articleId: article.id, accountId } as any);
    }
    return article;
  }
}
