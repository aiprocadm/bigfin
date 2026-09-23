import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { ImportBatchesService } from '@/modules/BankingTransactions/commands/ImportBatches.service';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { CreateUncategorizedTransactionService } from '@/modules/BankingCategorize/commands/CreateUncategorizedTransaction.service';
import { UncategorizedBankTransaction } from '@/modules/BankingTransactions/models/UncategorizedBankTransaction';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { decodeStatementBuffer } from '../utils/decodeStatement';
import { parse1CStatement } from '../utils/parse1CStatement';
import {
  resolveDirection,
  buildExternalId,
  makeExternalIdDeduper,
} from '../utils/statementHelpers';
import { Import1CResult } from '../dtos/Import1CResult.dto';

@Injectable()
export class Import1CStatementService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly createUncategorized: CreateUncategorizedTransactionService,
    // Пакет импорта (FT-043 ТЗ-3).
    private readonly importBatches: ImportBatchesService,

    @Inject(UncategorizedBankTransaction.name)
    private readonly uncategorizedModel: TenantModelProxy<
      typeof UncategorizedBankTransaction
    >,
  ) {}

  /**
   * Импортирует выписку 1С в таблицу необработанных операций.
   *
   * Конвенция знака суммы (соответствует virtual getters модели
   * UncategorizedBankTransaction):
   *   приход (money in)  → amount > 0 (положительный)
   *   расход (money out) → amount < 0 (отрицательный)
   *
   * @param accountId - ID счёта в системе
   * @param ourAccountNumber - Расчётный номер счёта (для определения направления)
   * @param currencyCode - Код валюты (например, 'RUB')
   * @param buffer - Буфер файла выписки (cp1251 или UTF-8)
   */
  public async import(
    accountId: number,
    ourAccountNumber: string,
    currencyCode: string,
    buffer: Buffer,
    fileName?: string,
  ): Promise<Import1CResult> {
    const text = decodeStatementBuffer(buffer);
    const parsed = parse1CStatement(text);
    const ourAccount = ourAccountNumber || parsed.headerAccount;

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      // Один импорт — один пакет: по нему его можно откатить (FT-043).
      const importBatchId = await this.importBatches.open(
        { source: 'file', accountId, fileName: fileName ?? null },
        trx,
      );
      let imported = 0;
      // Честный итог: раздельно по причинам (И1 карты v12).
      let duplicates = 0;
      let noDirection = 0;
      // Разводит совпадающие ключи внутри файла, чтобы две разные операции с
      // одинаковыми номером/датой/суммой не схлопнулись в дубль (И1 срез 2).
      const dedupeKey = makeExternalIdDeduper();

      for (const doc of parsed.documents) {
        const resolved = resolveDirection(doc, ourAccount);

        if (resolved.direction === 'unknown') {
          noDirection++;
          continue;
        }

        const externalId = dedupeKey(buildExternalId(doc));
        const exists = await this.importBatches.isDuplicate(accountId, externalId, trx);

        if (exists) {
          duplicates++;
          continue;
        }

        // Приход → положительная сумма; расход → отрицательная сумма.
        // Соответствует virtual getters модели: deposit = amount > 0,
        // withdrawal = amount < 0 (UncategorizedBankTransaction.ts:65,73).
        const amount =
          resolved.direction === 'in' ? doc.amount : -doc.amount;

        await this.createUncategorized.create(
          {
            date: doc.date,
            importBatchId,
            accountId,
            amount,
            currencyCode,
            payee: resolved.counterpartyName,
            payeeInn: resolved.counterpartyInn,
            description: doc.purpose,
            referenceNo: doc.docNumber,
            externalId,
          },
          trx,
        );

        imported++;
      }
      await this.importBatches.close(importBatchId, imported, trx);

      return {
        imported,
        duplicates,
        noDirection,
        unparsed: 0,
        skipped: duplicates + noDirection,
      };
    });
  }
}
