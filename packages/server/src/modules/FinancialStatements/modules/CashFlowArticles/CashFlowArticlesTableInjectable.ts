// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

import { CashFlowArticlesService } from './CashFlowArticlesService';
import { CashFlowArticlesTable } from './CashFlowArticlesTable';
import { ICashFlowArticlesQuery } from './CashFlowArticles.types';

@Injectable()
export class CashFlowArticlesTableInjectable {
  constructor(
    private readonly sheet: CashFlowArticlesService,
    private readonly i18nService: I18nService,
  ) {}

  /** Отчёт в табличном виде — общий источник для CSV, XLSX и PDF. */
  public async table(filter: ICashFlowArticlesQuery) {
    const { data, query, meta } = await this.sheet.sheet(filter);
    const table = new CashFlowArticlesTable(data, this.i18nService, {
      showTotalColumn: filter.showTotalColumn,
      showEmpty: filter.showEmpty,
      showTransfers: filter.showTransfers,
    });

    return {
      table: { columns: table.tableColumns(), rows: table.tableData() },
      meta,
      query,
    };
  }
}
