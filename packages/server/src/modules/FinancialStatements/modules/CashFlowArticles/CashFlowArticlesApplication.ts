// © 2026 Bigfin
import { Injectable } from '@nestjs/common';

import { CashFlowArticlesService } from './CashFlowArticlesService';
import { CashFlowArticlesTableInjectable } from './CashFlowArticlesTableInjectable';
import { CashFlowArticlesExport } from './CashFlowArticlesExport';
import { CashFlowArticlesPdfInjectable } from './CashFlowArticlesPdfInjectable';
import { ICashFlowArticlesQuery } from './CashFlowArticles.types';

@Injectable()
export class CashFlowArticlesApplication {
  constructor(
    private readonly sheetService: CashFlowArticlesService,
    private readonly tableService: CashFlowArticlesTableInjectable,
    private readonly exportService: CashFlowArticlesExport,
    private readonly pdfService: CashFlowArticlesPdfInjectable,
  ) {}

  public sheet(filter: ICashFlowArticlesQuery) {
    return this.sheetService.sheet(filter);
  }

  public table(filter: ICashFlowArticlesQuery) {
    return this.tableService.table(filter);
  }

  public csv(filter: ICashFlowArticlesQuery) {
    return this.exportService.csv(filter);
  }

  public xlsx(filter: ICashFlowArticlesQuery) {
    return this.exportService.xlsx(filter);
  }

  public pdf(filter: ICashFlowArticlesQuery) {
    return this.pdfService.pdf(filter);
  }
}
