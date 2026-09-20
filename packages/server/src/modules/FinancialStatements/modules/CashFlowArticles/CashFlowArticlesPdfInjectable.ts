// © 2026 Bigfin
import { Injectable } from '@nestjs/common';

import { TableSheetPdf } from '../../common/TableSheetPdf';
import { CashFlowArticlesTableInjectable } from './CashFlowArticlesTableInjectable';
import { ICashFlowArticlesQuery } from './CashFlowArticles.types';

@Injectable()
export class CashFlowArticlesPdfInjectable {
  constructor(
    private readonly tableService: CashFlowArticlesTableInjectable,
    private readonly tableSheetPdf: TableSheetPdf,
  ) {}

  public async pdf(query: ICashFlowArticlesQuery): Promise<Buffer> {
    const { table, meta } = await this.tableService.table(query);

    return this.tableSheetPdf.convertToPdf(
      table,
      meta.organizationName,
      meta.sheetName,
      meta.formattedDateRange,
    );
  }
}
