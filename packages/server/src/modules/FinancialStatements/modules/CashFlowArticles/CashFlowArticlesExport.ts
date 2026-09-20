// © 2026 Bigfin
import { Injectable } from '@nestjs/common';

import { TableSheet } from '../../common/TableSheet';
import { CashFlowArticlesTableInjectable } from './CashFlowArticlesTableInjectable';
import { ICashFlowArticlesQuery } from './CashFlowArticles.types';

@Injectable()
export class CashFlowArticlesExport {
  constructor(private readonly tableService: CashFlowArticlesTableInjectable) {}

  /** XLSX: суммы уходят числами, иначе файл в Excel не складывается. */
  public async xlsx(query: ICashFlowArticlesQuery): Promise<Buffer> {
    const { table } = await this.tableService.table(query);
    const tableSheet = new TableSheet(table);

    return tableSheet.convertToBuffer(tableSheet.convertToXLSX(), 'xlsx');
  }

  public async csv(query: ICashFlowArticlesQuery): Promise<string> {
    const { table } = await this.tableService.table(query);
    const tableSheet = new TableSheet(table);

    return tableSheet.convertToCSV();
  }
}
