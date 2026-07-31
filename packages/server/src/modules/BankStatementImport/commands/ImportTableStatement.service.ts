import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { CreateUncategorizedTransactionService } from '@/modules/BankingCategorize/commands/CreateUncategorizedTransaction.service';
import { UncategorizedBankTransaction } from '@/modules/BankingTransactions/models/UncategorizedBankTransaction';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import {
  ParsedTableRow,
  parseTableStatement,
} from '../utils/parseTableStatement';
import { Import1CResult } from '../dtos/Import1CResult.dto';

export interface TableStatementPreview {
  /** Сколько операций удалось разобрать. */
  total: number;
  toImport: number;
  duplicates: number;
  /** Строки, где не нашлось даты или суммы. */
  unparsed: number;
  columns: Record<string, string>;
  warnings: string[];
  /** Первые строки — показать пользователю, что именно распозналось. */
  sample: ParsedTableRow[];
}

const SAMPLE_SIZE = 20;

/**
 * Импорт выписки, выгруженной таблицей (⑨a): `.csv`, `.xlsx`, `.xls`.
 * Операции попадают в тот же конвейер «Разбор» ⑨, что и выписка 1С;
 * дедупликация — по `(accountId, external_id)`.
 */
@Injectable()
export class ImportTableStatementService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly createUncategorized: CreateUncategorizedTransactionService,

    @Inject(UncategorizedBankTransaction.name)
    private readonly uncategorizedModel: TenantModelProxy<
      typeof UncategorizedBankTransaction
    >,
  ) {}

  /** Разбирает файл и считает, что импортируется, ничего не записывая. */
  public async preview(
    accountId: number,
    buffer: Buffer,
    fileName: string,
  ): Promise<TableStatementPreview> {
    const parsed = parseTableStatement(buffer, fileName);

    let duplicates = 0;
    for (const row of parsed.rows) {
      if (await this.exists(accountId, row.externalId)) duplicates += 1;
    }

    return {
      total: parsed.rows.length,
      toImport: parsed.rows.length - duplicates,
      duplicates,
      unparsed: parsed.skipped,
      columns: parsed.columns,
      warnings: parsed.warnings,
      sample: parsed.rows.slice(0, SAMPLE_SIZE),
    };
  }

  public async import(
    accountId: number,
    currencyCode: string,
    buffer: Buffer,
    fileName: string,
  ): Promise<Import1CResult> {
    const parsed = parseTableStatement(buffer, fileName);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      let imported = 0;
      let skipped = 0;

      for (const row of parsed.rows) {
        if (await this.exists(accountId, row.externalId, trx)) {
          skipped += 1;
          continue;
        }
        await this.createUncategorized.create(
          {
            date: row.date,
            accountId,
            amount: row.amount,
            currencyCode: currencyCode || 'RUB',
            payee: row.payee ?? undefined,
            payeeInn: row.payeeInn ?? undefined,
            externalId: row.externalId,
            referenceNo: row.referenceNo ?? undefined,
            description: row.description ?? undefined,
          } as any,
          trx,
        );
        imported += 1;
      }
      return { imported, skipped };
    });
  }

  private async exists(
    accountId: number,
    externalId: string,
    trx?: Knex.Transaction,
  ): Promise<boolean> {
    const found = await this.uncategorizedModel()
      .query(trx)
      .findOne({ accountId, externalId });
    return !!found;
  }
}
