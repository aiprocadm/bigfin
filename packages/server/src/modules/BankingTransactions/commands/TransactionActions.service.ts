// © 2026 Bigfin
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Knex } from 'knex';
import { events } from '@/common/events/events';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { Deal } from '@/modules/Deals/models/Deal.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TransactionsLockingGuard } from '@/modules/TransactionsLocking/guards/TransactionsLockingGuard';
import { TransactionsLockingGroup } from '@/modules/TransactionsLocking/types/TransactionsLocking.types';
import { CASHFLOW_SPLIT_REFERENCE } from '@/modules/TransactionSplits/constants';
import { TransactionSplitsService } from '@/modules/TransactionSplits/TransactionSplits.service';
import { SplitLine } from '@/modules/TransactionSplits/utils/splitRules';
import { BankTransaction } from '../models/BankTransaction';
import { TransactionTag } from '../models/TransactionTag';
import { BankTransactionGLEntriesService } from './BankTransactionGLEntries';
import { transferPlan, TRANSACTION_ACTION_ERRORS } from '../utils/transactionActions';

/**
 * Действия с операцией из реестра (FT-022…FT-025 ТЗ-3): метка, сделка,
 * превращение в перевод, разбиение суммы.
 *
 * Каждое действие либо выполняется, либо отказывает НАЗВАННОЙ ошибкой с
 * человеческим текстом: меню реестра показывает этот текст, а не «ошибка».
 *
 * Проводки операции не правятся по месту, а пишутся заново тем же путём,
 * что при создании: иначе отчёты однажды разошлись бы с операцией.
 */
@Injectable()
export class TransactionActionsService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly eventEmitter: EventEmitter2,
    private readonly glEntries: BankTransactionGLEntriesService,
    private readonly lockingGuard: TransactionsLockingGuard,
    private readonly transactionSplits: TransactionSplitsService,

    @Inject(BankTransaction.name)
    private readonly bankTransactionModel: TenantModelProxy<typeof BankTransaction>,

    @Inject(AccountTransaction.name)
    private readonly ledgerModel: TenantModelProxy<typeof AccountTransaction>,

    @Inject(TransactionTag.name)
    private readonly tagModel: TenantModelProxy<typeof TransactionTag>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<typeof ManagementArticleAccount>,
  ) {}

  /** Живая денежная операция или названная ошибка. */
  private async liveOperation(id: number, trx?: Knex.Transaction): Promise<any> {
    const operation: any = await this.bankTransactionModel()
      .query(trx)
      .findById(id)
      .withGraphFetched('cashflowAccount');
    if (!operation || operation.deletedAt) {
      throw new ServiceError(
        TRANSACTION_ACTION_ERRORS.NOT_FOUND,
        'Операция не найдена или лежит в корзине',
        { id },
        HttpStatus.NOT_FOUND,
      );
    }
    return operation;
  }

  private async rewriteLedger(id: number, trx: Knex.Transaction) {
    await this.glEntries.revertJournalEntries(id, trx);
    await this.glEntries.writeJournalEntries(id, trx);
  }

  /** Все метки организации — для подсказки в поле и отбора. */
  public async listTags(): Promise<string[]> {
    const rows: any[] = await this.tagModel().query().distinct('tag').orderBy('tag');
    return rows.map((row) => row.tag);
  }

  /**
   * Метка документа (FT-025). Пустая метка снимает прежнюю. Ставится на
   * любой документ реестра, не только на денежную операцию: оплата счёта
   * тоже строка реестра.
   */
  public async setTag(referenceType: string, referenceId: number, rawTag: string | null) {
    const tag = (rawTag ?? '').trim().slice(0, 64) || null;
    const exists = await this.ledgerModel()
      .query()
      .where('referenceType', referenceType)
      .where('referenceId', referenceId)
      .first();
    if (!exists) {
      throw new ServiceError(
        TRANSACTION_ACTION_ERRORS.NOT_FOUND,
        'Операция не найдена',
        { referenceType, referenceId },
        HttpStatus.NOT_FOUND,
      );
    }
    return this.uow.withTransaction(async (trx) => {
      const old: any = await this.tagModel()
        .query(trx)
        .findOne({ referenceType, referenceId });
      if (!tag) {
        if (old) await this.tagModel().query(trx).deleteById(old.id);
      } else if (old) {
        await this.tagModel().query(trx).findById(old.id).patch({ tag } as any);
      } else {
        await this.tagModel().query(trx).insert({ referenceType, referenceId, tag } as any);
      }
      await this.eventEmitter.emitAsync(events.cashflow.onTransactionTagged, {
        referenceType,
        referenceId,
        tag,
        oldTag: old?.tag ?? null,
        trx,
      });
      return { referenceType, referenceId, tag };
    });
  }

  /** Привязать к сделке или снять привязку (FT-022). */
  public async linkDeal(id: number, dealId: number | null) {
    const operation = await this.liveOperation(id);
    await this.lockingGuard.validateTransactionsLocking(
      operation.date,
      TransactionsLockingGroup.Financial,
    );
    if (dealId) {
      const deal = await this.dealModel().query().findById(dealId);
      if (!deal) {
        throw new ServiceError(
          TRANSACTION_ACTION_ERRORS.DEAL_NOT_FOUND,
          'Сделка не найдена',
          { dealId },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }
    return this.uow.withTransaction(async (trx) => {
      await this.bankTransactionModel()
        .query(trx)
        .findById(id)
        .patch({ projectId: dealId ?? null } as any);
      await this.rewriteLedger(id, trx);
      await this.eventEmitter.emitAsync(events.cashflow.onTransactionDealLinked, {
        cashflowTransactionId: id,
        dealId: dealId ?? null,
        oldDealId: operation.projectId ?? null,
        trx,
      });
      return { id, dealId: dealId ?? null };
    });
  }

  /**
   * Превратить поступление или выплату в перевод между своими счетами
   * (FT-022). Отказы названы: перевод уже перевод, счёт тот же, валюты
   * разные, у операции есть части.
   */
  public async convertToTransfer(id: number, toAccountId: number) {
    const operation = await this.liveOperation(id);
    const target: any = await this.accountModel().query().findById(toAccountId);
    const splits = await this.transactionSplits.getSplits(CASHFLOW_SPLIT_REFERENCE, id);
    const plan = transferPlan(operation, target, splits.length > 0);
    if ('error' in plan) {
      throw new ServiceError(plan.error, plan.message, { id, toAccountId }, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    await this.lockingGuard.validateTransactionsLocking(
      operation.date,
      TransactionsLockingGroup.Financial,
    );
    return this.uow.withTransaction(async (trx) => {
      await this.bankTransactionModel()
        .query(trx)
        .findById(id)
        .patch({
          transactionType: plan.transactionType,
          creditAccountId: toAccountId,
          contactId: null,
          projectId: null,
        } as any);
      await this.rewriteLedger(id, trx);
      await this.eventEmitter.emitAsync(events.cashflow.onTransactionConvertedToTransfer, {
        cashflowTransactionId: id,
        oldTransactionType: operation.transactionType,
        transactionType: plan.transactionType,
        toAccountId,
        trx,
      });
      return { id, transactionType: plan.transactionType, toAccountId };
    });
  }

  /**
   * Разбить сумму операции по статьям (FT-022, FT-023). Части пишутся под
   * видом `CashflowTransaction` — только такие проводит сборка проводок,
   * поэтому разбиение меняет отчёты, а не только карточку. Пустой список
   * снимает разбиение.
   *
   * У каждой части — статья со счётом: часть без счёта проводке некуда
   * положить, и сумма операции разошлась бы с проводками.
   */
  public async setSplits(id: number, lines: SplitLine[], outerTrx?: Knex.Transaction) {
    const operation = await this.liveOperation(id, outerTrx);
    await this.assertArticlesHaveAccounts(lines);
    await this.lockingGuard.validateTransactionsLocking(
      operation.date,
      TransactionsLockingGroup.Financial,
    );
    return this.uow.withTransaction(async (trx) => {
      if (lines.length === 0) {
        await this.transactionSplits.clearSplits(CASHFLOW_SPLIT_REFERENCE, id, trx);
      } else {
        await this.transactionSplits.saveSplits(
          {
            referenceType: CASHFLOW_SPLIT_REFERENCE,
            referenceId: id,
            parentAmount: Math.abs(Number(operation.amount)),
            lines,
          },
          trx,
        );
      }
      await this.rewriteLedger(id, trx);
      await this.eventEmitter.emitAsync(events.cashflow.onTransactionSplitsChanged, {
        cashflowTransactionId: id,
        parts: lines.length,
        trx,
      });
      return { id, parts: lines.length };
    }, outerTrx);
  }

  private async assertArticlesHaveAccounts(lines: SplitLine[]) {
    const articleIds = [...new Set(lines.map((line) => Number(line.articleId)))];
    if (lines.some((line) => !line.articleId)) {
      throw new ServiceError(
        TRANSACTION_ACTION_ERRORS.SPLIT_WITHOUT_ARTICLE,
        'У каждой части должна быть статья',
        undefined,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (articleIds.length === 0) return;
    const links: any[] = await this.articleAccountModel().query().whereIn('articleId', articleIds);
    const withAccount = new Set(links.map((link) => Number(link.articleId)));
    const missing = articleIds.filter((articleId) => !withAccount.has(articleId));
    if (missing.length > 0) {
      throw new ServiceError(
        TRANSACTION_ACTION_ERRORS.SPLIT_ARTICLE_WITHOUT_ACCOUNT,
        'У статьи части нет счёта учёта — проводке некуда положить эту часть',
        { articleIds: missing },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }
}

