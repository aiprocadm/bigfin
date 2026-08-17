import * as moment from 'moment';
import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { CreateBankTransactionService } from '@/modules/BankingTransactions/commands/CreateBankTransaction.service';
import { CreateBankTransactionDto } from '@/modules/BankingTransactions/dtos/CreateBankTransaction.dto';
import { CASHFLOW_TRANSACTION_TYPE } from '@/modules/BankingTransactions/constants';
import { ACCOUNT_TYPE } from '@/constants/accounts';
import { PlannedOperation } from '../models/PlannedOperation.model';
import { MaterializePlannedOperationDto } from '../dtos/PlannedOperation.dto';
import { ERRORS, FORECAST_STATUSES } from '../constants';
import {
  nextOccurrenceAfter,
  RecurrenceRule,
} from '../utils/expandRecurrence';

/**
 * Материализация плановой операции в реальную денежную (О3 карты v13).
 *
 * План — намерение (аренда, зарплата, подписка); по кнопке из него создаётся
 * НАСТОЯЩАЯ денежная операция: расход/приход по денежному счёту плана, а
 * счёт-корреспондент берётся из статьи плана. Чтобы прогноз не считал деньги
 * дважды (реальная операция уже в остатке), разовый план помечается
 * исполненным, а повторяющийся сдвигается на следующее вхождение после
 * материализованного; когда повторение исчерпано — тоже исполнен.
 */
@Injectable()
export class MaterializePlannedOperationService {
  constructor(
    @Inject(PlannedOperation.name)
    private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,

    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    private readonly createBankTransactionService: CreateBankTransactionService,
  ) {}

  public async materialize(
    plannedOperationId: number,
    dto?: MaterializePlannedOperationDto,
  ) {
    const op = await this.operationModel()
      .query()
      .findById(plannedOperationId);

    if (!op) {
      throw new ServiceError(ERRORS.PLANNED_OPERATION_NOT_FOUND);
    }
    if (!(FORECAST_STATUSES as readonly string[]).includes(op.status)) {
      throw new ServiceError(ERRORS.OPERATION_NOT_MATERIALIZABLE);
    }
    if (!op.accountId) {
      throw new ServiceError(ERRORS.PLAN_HAS_NO_ACCOUNT);
    }
    if (!op.articleId) {
      throw new ServiceError(ERRORS.PLAN_HAS_NO_ARTICLE);
    }
    const creditAccountId = await this.resolveCreditAccountId(op);

    const date = dto?.date || moment(op.plannedDate).format('YYYY-MM-DD');
    const isOutflow = op.direction === 'outflow';

    const transaction =
      await this.createBankTransactionService.newCashflowTransaction({
        date,
        transactionType: isOutflow
          ? CASHFLOW_TRANSACTION_TYPE.OTHER_EXPENSE
          : CASHFLOW_TRANSACTION_TYPE.OTHER_INCOME,
        amount: Number(op.amount),
        exchangeRate: 1,
        currencyCode: op.currencyCode,
        creditAccountId,
        cashflowAccountId: op.accountId,
        description: op.description || '',
        ...(op.branchId ? { branchId: op.branchId } : {}),
        publish: true,
        // DTO объявляет date как Date, но по HTTP она всегда строка — тот же вид.
      } as unknown as CreateBankTransactionDto);

    await this.advancePlan(op, date);

    return transaction;
  }

  /**
   * Счёт-корреспондент из статьи плана: единственный привязанный счёт
   * подходящего типа. Ноль или несколько — деловая ошибка, автоматика не
   * должна угадывать за пользователя.
   */
  private async resolveCreditAccountId(op: PlannedOperation): Promise<number> {
    const article: any = await this.articleModel()
      .query()
      .findById(op.articleId)
      .withGraphFetched('accounts');

    if (!article) {
      throw new ServiceError(ERRORS.ARTICLE_NOT_FOUND);
    }
    const allowedTypes: string[] =
      op.direction === 'outflow'
        ? [
            ACCOUNT_TYPE.EXPENSE,
            ACCOUNT_TYPE.OTHER_EXPENSE,
            ACCOUNT_TYPE.COST_OF_GOODS_SOLD,
          ]
        : [ACCOUNT_TYPE.INCOME, ACCOUNT_TYPE.OTHER_INCOME];

    const candidates = (article.accounts || []).filter((account: any) =>
      allowedTypes.includes(account.accountType),
    );
    if (candidates.length === 0) {
      throw new ServiceError(ERRORS.ARTICLE_HAS_NO_SUITABLE_ACCOUNT);
    }
    if (candidates.length > 1) {
      throw new ServiceError(ERRORS.ARTICLE_ACCOUNT_AMBIGUOUS);
    }
    return candidates[0].id;
  }

  /**
   * Уводит материализованное вхождение из прогноза (иначе двойной счёт:
   * деньги уже в реальном остатке И всё ещё в плане).
   */
  private async advancePlan(op: PlannedOperation, materializedDate: string) {
    if (!op.recurrence) {
      await this.operationModel()
        .query()
        .patchAndFetchById(op.id, { status: 'done' });
      return;
    }
    const next = nextOccurrenceAfter(
      op.recurrence as unknown as RecurrenceRule,
      moment(op.plannedDate).format('YYYY-MM-DD'),
      materializedDate,
    );
    await this.operationModel()
      .query()
      .patchAndFetchById(
        op.id,
        next ? { plannedDate: next } : { status: 'done' },
      );
  }
}
