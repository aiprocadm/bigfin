// © 2026 Bigfin
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import * as moment from 'moment';
import { ClsService } from 'nestjs-cls';

import { Account } from '@/modules/Accounts/models/Account.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantUser } from '@/modules/Tenancy/TenancyModels/models/TenantUser.model';
import { TransactionsLockingGuard } from '@/modules/TransactionsLocking/guards/TransactionsLockingGuard';
import { TransactionsLockingGroup } from '@/modules/TransactionsLocking/types/TransactionsLocking.types';
import { BankTransaction } from '../models/BankTransaction';
import { UncategorizedBankTransaction } from '../models/UncategorizedBankTransaction';
import { BankTransactionGLEntriesService } from './BankTransactionGLEntries';
import { DeleteCashflowTransaction } from './DeleteCashflowTransaction.service';

/** Причины удаления — фильтр экрана корзины (FT-042). */
export const TRASH_REASONS = ['manual', 'import_rollback', 'reconciliation'] as const;
export type TrashReason = (typeof TRASH_REASONS)[number];

/** Сколько дней корзина хранит операцию до окончательного удаления. */
export const TRASH_RETENTION_DAYS = 90;

/**
 * Что лежит в корзине: денежная операция (со строкой выписки, из которой
 * её разнесли, если такая есть) или строка выписки, которую так и не
 * разнесли.
 */
export type TrashKind = 'cashflow' | 'bank_line';
export interface TrashItemRef {
  kind: TrashKind;
  id: number;
}

export const TRASH_ERRORS = {
  NOT_FOUND: 'TRASH_ITEM_NOT_FOUND',
  NOT_IN_TRASH: 'TRASH_ITEM_NOT_IN_TRASH',
  ALREADY_IN_TRASH: 'TRASH_ITEM_ALREADY_IN_TRASH',
};

const now = () => moment().format('YYYY-MM-DD HH:mm:ss');

/**
 * Корзина операций (FT-042 ТЗ-3).
 *
 * УДАЛЕНИЕ СНИМАЕТ ПРОВОДКИ. Отчёты и остаток счёта читают проводки —
 * значит, удалённая операция уходит из них сразу. Сама строка остаётся в
 * базе с отметкой «когда, кем, почему», а части разбиения не трогаются:
 * восстановление пересобирает проводки из документа, и части должны
 * дожить до этого момента.
 *
 * ВОССТАНОВЛЕНИЕ возвращает операцию в тот же период — пересобирает
 * проводки. Закрытый период — отказ с названной ошибкой: восстановление
 * меняет его отчёты так же, как новая операция.
 *
 * ОКОНЧАТЕЛЬНОЕ УДАЛЕНИЕ — только владелец (проверяет ручка), не в
 * закрытом периоде; идёт обычным путём удаления операции.
 */
@Injectable()
export class TransactionsTrashService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly cls: ClsService,
    private readonly glEntries: BankTransactionGLEntriesService,
    private readonly lockingGuard: TransactionsLockingGuard,
    private readonly deleteCashflow: DeleteCashflowTransaction,

    @Inject(BankTransaction.name)
    private readonly bankTransactionModel: TenantModelProxy<typeof BankTransaction>,

    @Inject(UncategorizedBankTransaction.name)
    private readonly uncategorizedModel: TenantModelProxy<typeof UncategorizedBankTransaction>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(TenantUser.name)
    private readonly tenantUserModel: TenantModelProxy<typeof TenantUser>,
  ) {}

  private userId(): number | null {
    const id = Number(this.cls.get('userId'));
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  /** Строка выписки считается в счётчике «ждут разноски» у счёта. */
  private counted(row: any) {
    return !row.categorized && !row.excludedAt && !row.isPending && row.accountId;
  }

  private async bumpCounter(row: any, delta: 1 | -1, trx?: Knex.Transaction) {
    if (!this.counted(row)) return;
    const query = this.accountModel().query(trx).findById(row.accountId);
    await (delta > 0
      ? query.increment('uncategorizedTransactions', 1)
      : query.decrement('uncategorizedTransactions', 1));
  }

  /** В корзину. `trx` — чтобы откат импорта шёл одной транзакцией (FT-043). */
  public async trash(items: TrashItemRef[], reason: TrashReason = 'manual', trx?: Knex.Transaction) {
    return this.uow.withTransaction(async (tx) => {
      const marks = { deletedAt: now(), deletedBy: this.userId(), deleteReason: reason };
      let trashed = 0;
      for (const item of items) {
        if (item.kind === 'cashflow') {
          const transaction: any = await this.bankTransactionModel().query(tx).findById(item.id);
          if (!transaction) throw new ServiceError(TRASH_ERRORS.NOT_FOUND, 'Операция не найдена', item);
          if (transaction.deletedAt) continue;
          // Удаление снимает проводки — отчёты закрытого периода поменялись
          // бы так же, как от новой операции.
          await this.lockingGuard.validateTransactionsLocking(
            transaction.date,
            TransactionsLockingGroup.Financial,
          );
          await this.bankTransactionModel().query(tx).findById(item.id).patch(marks as any);
          await this.glEntries.revertJournalEntries(item.id, tx);
          // Строка выписки, из которой разнесли операцию, уходит вместе с ней:
          // иначе она вернулась бы в «ждут разноски».
          await this.uncategorizedModel()
            .query(tx)
            .where('categorizeRefType', 'CashflowTransaction')
            .where('categorizeRefId', item.id)
            .whereNull('deletedAt')
            .patch(marks as any);
        } else {
          const row: any = await this.uncategorizedModel().query(tx).findById(item.id);
          if (!row) throw new ServiceError(TRASH_ERRORS.NOT_FOUND, 'Строка выписки не найдена', item);
          if (row.deletedAt) continue;
          if (row.categorized && row.categorizeRefType === 'CashflowTransaction') {
            // Разнесённая строка удаляется вместе со своей операцией.
            await this.trash([{ kind: 'cashflow', id: row.categorizeRefId }], reason, tx);
            trashed += 1;
            continue;
          }
          await this.uncategorizedModel().query(tx).findById(item.id).patch(marks as any);
          await this.bumpCounter(row, -1, tx);
        }
        trashed += 1;
      }
      return { trashed };
    }, trx);
  }

  /** Вернуть из корзины — в тот же период. */
  public async restore(items: TrashItemRef[]) {
    return this.uow.withTransaction(async (tx) => {
      const clear = { deletedAt: null, deletedBy: null, deleteReason: null };
      for (const item of items) {
        if (item.kind === 'cashflow') {
          const transaction: any = await this.bankTransactionModel().query(tx).findById(item.id);
          if (!transaction) throw new ServiceError(TRASH_ERRORS.NOT_FOUND, 'Операция не найдена', item);
          if (!transaction.deletedAt) continue;
          await this.lockingGuard.validateTransactionsLocking(
            transaction.date,
            TransactionsLockingGroup.Financial,
          );
          await this.bankTransactionModel().query(tx).findById(item.id).patch(clear as any);
          await this.glEntries.writeJournalEntries(item.id, tx);
          await this.uncategorizedModel()
            .query(tx)
            .where('categorizeRefType', 'CashflowTransaction')
            .where('categorizeRefId', item.id)
            .patch(clear as any);
        } else {
          const row: any = await this.uncategorizedModel().query(tx).findById(item.id);
          if (!row) throw new ServiceError(TRASH_ERRORS.NOT_FOUND, 'Строка выписки не найдена', item);
          if (!row.deletedAt) continue;
          if (row.categorized && row.categorizeRefType === 'CashflowTransaction') {
            await this.restoreOne({ kind: 'cashflow', id: row.categorizeRefId }, tx);
            continue;
          }
          await this.uncategorizedModel().query(tx).findById(item.id).patch(clear as any);
          await this.bumpCounter(row, 1, tx);
        }
      }
      return { restored: items.length };
    });
  }

  private async restoreOne(item: TrashItemRef, tx: Knex.Transaction) {
    const transaction: any = await this.bankTransactionModel().query(tx).findById(item.id);
    if (!transaction?.deletedAt) return;
    await this.lockingGuard.validateTransactionsLocking(transaction.date, TransactionsLockingGroup.Financial);
    const clear = { deletedAt: null, deletedBy: null, deleteReason: null };
    await this.bankTransactionModel().query(tx).findById(item.id).patch(clear as any);
    await this.glEntries.writeJournalEntries(item.id, tx);
    await this.uncategorizedModel()
      .query(tx)
      .where('categorizeRefType', 'CashflowTransaction')
      .where('categorizeRefId', item.id)
      .patch(clear as any);
  }

  /**
   * Удалить окончательно — только из корзины и не в закрытом периоде.
   * Денежная операция уходит обычным путём удаления (подписчики снимут
   * части разбиения и запишут аудит), строки выписки — вслед за ней.
   *
   * `trx` — чужая транзакция (например, импорта): стирание тогда
   * отменится вместе с ней.
   */
  public async purge(items: TrashItemRef[], trx?: Knex.Transaction) {
    let purged = 0;
    for (const item of items) {
      if (item.kind === 'cashflow') {
        const transaction: any = await this.bankTransactionModel().query(trx).findById(item.id);
        if (!transaction) continue;
        if (!transaction.deletedAt) {
          throw new ServiceError(TRASH_ERRORS.NOT_IN_TRASH, 'Окончательно удаляются только операции из корзины', item, HttpStatus.UNPROCESSABLE_ENTITY);
        }
        await this.lockingGuard.validateTransactionsLocking(transaction.date, TransactionsLockingGroup.Financial);
        await this.uow.withTransaction(async (tx) => {
          await this.uncategorizedModel()
            .query(tx)
            .where('categorizeRefType', 'CashflowTransaction')
            .where('categorizeRefId', item.id)
            .delete();
          await this.deleteCashflow.deleteCashflowTransaction(item.id, tx);
        }, trx);
      } else {
        const row: any = await this.uncategorizedModel().query(trx).findById(item.id);
        if (!row) continue;
        if (!row.deletedAt) {
          throw new ServiceError(TRASH_ERRORS.NOT_IN_TRASH, 'Окончательно удаляются только строки из корзины', item, HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if (row.categorized && row.categorizeRefType === 'CashflowTransaction') {
          await this.purge([{ kind: 'cashflow', id: row.categorizeRefId }], trx);
        } else {
          await this.uncategorizedModel().query(trx).findById(item.id).delete();
        }
      }
      purged += 1;
    }
    return { purged };
  }

  /** Период даты закрыт — окончательно удалить операцию в нём нельзя. */
  public isPeriodClosed(date: any) {
    return this.lockingGuard.isTransactionsLocking(date, TransactionsLockingGroup.Financial);
  }

  /**
   * Содержимое корзины: денежные операции и неразнесённые строки выписки,
   * свежие удаления сверху. Строка выписки разнесённой операции отдельно не
   * показывается — она часть своей операции.
   */
  public async list(query: { fromDate?: string; toDate?: string; reason?: string }) {
    const inPeriod = (q: any, column: string) => {
      if (query.fromDate) q.where(column, '>=', query.fromDate);
      if (query.toDate) q.where(column, '<=', query.toDate);
      if (query.reason) q.where('deleteReason', query.reason);
    };
    const operations: any[] = await this.bankTransactionModel()
      .query()
      .modify('deleted')
      .onBuild((q) => inPeriod(q, 'date'))
      .withGraphFetched('cashflowAccount')
      .orderBy('deletedAt', 'desc');
    const lines: any[] = await this.uncategorizedModel()
      .query()
      .modify('deleted')
      .where('categorized', false)
      .onBuild((q) => inPeriod(q, 'date'))
      .withGraphFetched('account')
      .orderBy('deletedAt', 'desc');

    const userIds = [...new Set([...operations, ...lines].map((r) => r.deletedBy).filter(Boolean))];
    const users: any[] = userIds.length
      ? await this.tenantUserModel().query().whereIn('systemUserId', userIds)
      : [];
    const nameOf = new Map<number, string>(
      users.map((u) => [u.systemUserId, [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email]),
    );
    const purgeAt = (deletedAt: any) =>
      moment(deletedAt).add(TRASH_RETENTION_DAYS, 'days').format('YYYY-MM-DD');

    return [
      ...operations.map((row) => ({
        kind: 'cashflow' as TrashKind,
        id: row.id,
        date: row.date,
        amount: row.amount,
        direction: row.isCashDebit ? 'in' : 'out',
        currencyCode: row.currencyCode,
        accountName: row.cashflowAccount?.name ?? null,
        description: row.description ?? null,
        deletedAt: row.deletedAt,
        deletedBy: nameOf.get(row.deletedBy) ?? null,
        deleteReason: row.deleteReason,
        purgeAt: purgeAt(row.deletedAt),
      })),
      ...lines.map((row) => ({
        kind: 'bank_line' as TrashKind,
        id: row.id,
        date: row.date,
        amount: Math.abs(Number(row.amount)),
        direction: Number(row.amount) >= 0 ? 'in' : 'out',
        currencyCode: row.currencyCode,
        accountName: row.account?.name ?? null,
        description: row.description ?? row.payee ?? null,
        deletedAt: row.deletedAt,
        deletedBy: nameOf.get(row.deletedBy) ?? null,
        deleteReason: row.deleteReason,
        purgeAt: purgeAt(row.deletedAt),
      })),
    ].sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)));
  }

  /**
   * Окончательно удалить то, что пролежало дольше срока (чистка по
   * расписанию). Операции закрытых периодов остаются — их удаление
   * запрещено, и чистка не вправе обходить запрет.
   */
  public async purgeExpired(days = TRASH_RETENTION_DAYS) {
    const border = moment().subtract(days, 'days').format('YYYY-MM-DD HH:mm:ss');
    const operations: any[] = await this.bankTransactionModel()
      .query()
      .modify('deleted')
      .where('deletedAt', '<', border)
      .select('id');
    const lines: any[] = await this.uncategorizedModel()
      .query()
      .modify('deleted')
      .where('categorized', false)
      .where('deletedAt', '<', border)
      .select('id');
    let purged = 0;
    let kept = 0;
    for (const item of [
      ...operations.map((r) => ({ kind: 'cashflow' as TrashKind, id: r.id })),
      ...lines.map((r) => ({ kind: 'bank_line' as TrashKind, id: r.id })),
    ]) {
      try {
        purged += (await this.purge([item])).purged;
      } catch {
        kept += 1;
      }
    }
    return { purged, kept };
  }
}
