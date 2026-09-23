// © 2026 Bigfin
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import * as moment from 'moment';
import { ClsService } from 'nestjs-cls';

import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ImportBatch } from '../models/ImportBatch';
import { UncategorizedBankTransaction } from '../models/UncategorizedBankTransaction';
import { TransactionsTrashService } from './TransactionsTrash.service';

export type ImportBatchSource = 'file' | 'bank' | 'api';

export const IMPORT_BATCH_ERRORS = {
  NOT_FOUND: 'IMPORT_BATCH_NOT_FOUND',
  ALREADY_ROLLED_BACK: 'IMPORT_BATCH_ALREADY_ROLLED_BACK',
};

/**
 * Пакеты импорта и их откат (FT-043 ТЗ-3).
 *
 * Откат переводит ВСЕ строки пакета в корзину одной транзакцией: если хоть
 * одна строка не может уйти (например, её операция в закрытом периоде),
 * не уходит ни одна — полуоткаченный импорт хуже неоткаченного.
 * Разнесённые строки уходят вместе со своими операциями — поэтому остаток
 * счёта возвращается к значению до импорта.
 */
@Injectable()
export class ImportBatchesService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly cls: ClsService,
    private readonly trash: TransactionsTrashService,

    @Inject(ImportBatch.name)
    private readonly batchModel: TenantModelProxy<typeof ImportBatch>,

    @Inject(UncategorizedBankTransaction.name)
    private readonly uncategorizedModel: TenantModelProxy<typeof UncategorizedBankTransaction>,
  ) {}

  /** Открыть пакет в начале импорта — в его транзакции. */
  public async open(
    input: { source: ImportBatchSource; accountId: number; fileName?: string | null },
    trx?: Knex.Transaction,
  ): Promise<number> {
    const userId = Number(this.cls.get('userId'));
    const batch: any = await this.batchModel()
      .query(trx)
      .insert({
        source: input.source,
        accountId: input.accountId,
        fileName: input.fileName ?? null,
        rowsCount: 0,
        createdBy: Number.isFinite(userId) && userId > 0 ? userId : null,
        createdAt: moment().format('YYYY-MM-DD HH:mm:ss'),
      } as any);
    return Number(batch.id);
  }

  /** Закрыть: сколько строк легло. Пустой пакет не засоряет историю. */
  public async close(batchId: number, rowsCount: number, trx?: Knex.Transaction) {
    if (rowsCount === 0) {
      await this.batchModel().query(trx).deleteById(batchId);
      return;
    }
    await this.batchModel().query(trx).findById(batchId).patch({ rowsCount } as any);
  }

  /**
   * Строка с таким номером у банка уже есть? Удалённую ОТКАТОМ ИМПОРТА
   * строку новый импорт заменяет (иначе исправленный файл нельзя было бы
   * загрузить заново), а удалённую ЧЕЛОВЕКОМ — нет: он удалил её
   * осознанно, и сверка покажет её с пометкой «была удалена».
   *
   * `purge: false` — для предпросмотра: он ничего не меняет в базе.
   */
  public async isDuplicate(
    accountId: number,
    externalId: string | null | undefined,
    trx?: Knex.Transaction,
    options: { purge?: boolean } = {},
  ): Promise<boolean> {
    if (!externalId) return false;
    const found: any = await this.uncategorizedModel()
      .query(trx)
      .findOne({ accountId, externalId });
    if (!found) return false;
    if (found.deletedAt && found.deleteReason === 'import_rollback' && !found.categorized) {
      if (options.purge !== false) {
        await this.uncategorizedModel().query(trx).deleteById(found.id);
      }
      return false;
    }
    return true;
  }

  /** История импорта: свежие сверху, с тем, что от пакета осталось. */
  public async list(accountId?: number) {
    const batches: any[] = await this.batchModel()
      .query()
      .onBuild((q) => {
        if (accountId) q.where('accountId', accountId);
      })
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')
      .limit(200);
    if (batches.length === 0) return [];
    const rows: any[] = await this.uncategorizedModel()
      .query()
      .whereIn('importBatchId', batches.map((b) => b.id))
      .select('importBatchId', 'categorized', 'deletedAt');
    return batches.map((batch) => {
      const own = rows.filter((row) => Number(row.importBatchId) === Number(batch.id));
      return {
        ...batch,
        activeRows: own.filter((row) => !row.deletedAt).length,
        categorizedRows: own.filter((row) => !row.deletedAt && row.categorized).length,
        canRollback: !batch.rolledBackAt && own.some((row) => !row.deletedAt),
      };
    });
  }

  /** Откатить пакет: все его строки — в корзину одной транзакцией. */
  public async rollback(batchId: number) {
    const batch: any = await this.batchModel().query().findById(batchId);
    if (!batch) {
      throw new ServiceError(IMPORT_BATCH_ERRORS.NOT_FOUND, 'Импорт не найден', null, HttpStatus.NOT_FOUND);
    }
    if (batch.rolledBackAt) {
      throw new ServiceError(
        IMPORT_BATCH_ERRORS.ALREADY_ROLLED_BACK,
        'Этот импорт уже откачен',
        null,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return this.uow.withTransaction(async (trx) => {
      const rows: any[] = await this.uncategorizedModel()
        .query(trx)
        .where('importBatchId', batchId)
        .whereNull('deletedAt')
        .select('id');
      const result = await this.trash.trash(
        rows.map((row) => ({ kind: 'bank_line' as const, id: row.id })),
        'import_rollback',
        trx,
      );
      await this.batchModel()
        .query(trx)
        .findById(batchId)
        .patch({ rolledBackAt: moment().format('YYYY-MM-DD HH:mm:ss') } as any);
      return { batchId, trashed: result.trashed };
    });
  }
}
